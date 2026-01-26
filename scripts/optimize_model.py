import os
import numpy as np
import onnx
from PIL import Image
from onnxruntime.quantization import quantize_static, QuantType, CalibrationDataReader, quant_pre_process
import glob

class LayoutCalibrationDataReader(CalibrationDataReader):
    def __init__(self, image_paths, input_name, imgsz=1024):
        self.image_paths = image_paths
        self.input_name = input_name
        self.imgsz = imgsz
        self.data_iter = iter(self.image_paths)

    def preprocess(self, image_path):
        img = Image.open(image_path).convert('RGB')
        img = img.resize((self.imgsz, self.imgsz), Image.BILINEAR)
        img_array = np.array(img).astype(np.float32) / 255.0
        img_array = img_array.transpose(2, 0, 1) # CHW
        img_array = np.expand_dims(img_array, axis=0) # BCHW
        return img_array

    def get_next(self):
        try:
            image_path = next(self.data_iter)
            return {self.input_name: self.preprocess(image_path)}
        except StopIteration:
            return None

def optimize_model(input_model_path, output_model_path, calibration_images):
    print(f"--- Starting Optimization for {os.path.basename(input_model_path)} ---")
    
    if not os.path.exists(input_model_path):
        print(f"Error: Input model {input_model_path} not found.")
        return

    # 1. onnxsim Pre-processing
    print("Step 1: Simplifying model with onnxsim...")
    simplified_path = input_model_path.replace(".onnx", "_sim.onnx")
    try:
        import onnxsim
        model = onnx.load(input_model_path)
        model_simp, check = onnxsim.simplify(model)
        if check:
            onnx.save(model_simp, simplified_path)
            actual_input = simplified_path
            print("Model simplified successfully.")
        else:
            print("onnxsim check failed, using original model.")
            actual_input = input_model_path
    except Exception as e:
        print(f"onnxsim failed: {e}. Skipping simplification.")
        actual_input = input_model_path

    # 2. ORT Quant Pre-processing
    print("Step 2: Pre-processing for quantization...")
    pre_processed_path = actual_input.replace(".onnx", "_pre.onnx")
    try:
        quant_pre_process(actual_input, pre_processed_path)
        if os.path.exists(pre_processed_path):
            actual_input = pre_processed_path
            print("Pre-processing finished.")
    except Exception as e:
        print(f"Pre-processing failed: {e}.")

    # 3. Static Quantization
    print(f"Step 3: Performing Static INT8 Quantization with {len(calibration_images)} images...")
    
    # Needs a session to get input name
    import onnxruntime as ort
    temp_sess = ort.InferenceSession(actual_input, providers=['CPUExecutionProvider'])
    input_name = temp_sess.get_inputs()[0].name
    del temp_sess

    dr = LayoutCalibrationDataReader(calibration_images, input_name)
    
    quantize_static(
        actual_input,
        output_model_path,
        calibration_data_reader=dr,
        quant_format=QuantType.QInt8,
        weight_type=QuantType.QInt8,
        # Windows CPU optimizations work better with per-channel for weights
        # extra_options={'WeightSymmetric': True, 'ActivationSymmetric': False}
    )
    
    # Cleanup temporary files
    for p in [simplified_path, pre_processed_path]:
        if p != input_model_path and os.path.exists(p):
            os.remove(p)
            
    print(f"Optimization finished. Saved to: {output_model_path}")
    
    # Benchmark Size
    orig_size = os.path.getsize(input_model_path) / (1024 * 1024)
    new_size = os.path.getsize(output_model_path) / (1024 * 1024)
    print(f"Original: {orig_size:.2f} MB -> Optimized: {new_size:.2f} MB (Reduction: {(1-new_size/orig_size)*100:.1f}%)")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    model_dir = os.path.join(base_dir, "backend", "data", "models")
    input_path = os.path.join(model_dir, "yolov10-doclayout.onnx")
    output_path = os.path.join(model_dir, "yolov10-doclayout_int8_static.onnx")
    
    # Find calibration images in uploads
    calib_images = glob.glob(os.path.join(base_dir, "backend", "data", "uploads", "images_*", "*.png"))
    if not calib_images:
        print("Warning: No calibration images found in backend/data/uploads. Static quantization will be low quality.")
        # Try a fallback or error
    else:
        # Take up to 50 images for calibration
        calib_images = calib_images[:50]
        optimize_model(input_path, output_path, calib_images)
