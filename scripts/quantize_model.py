import os
import onnx
from onnxruntime.quantization import quantize_dynamic, QuantType

def quantize_model(input_model_path, output_model_path):
    print(f"Loading model from {input_model_path}...")
    
    if not os.path.exists(input_model_path):
        print(f"Error: Input model {input_model_path} not found.")
        return

    # 预处理：解决 "Expected to be an initializer" 等图结构问题
    print("Starting pre-processing...")
    pre_processed_path = input_model_path.replace(".onnx", "_pre.onnx")
    from onnxruntime.quantization import quant_pre_process
    try:
        quant_pre_process(input_model_path, pre_processed_path)
        actual_input = pre_processed_path
        print(f"Pre-processing finished. Using {pre_processed_path} for quantization.")
    except Exception as e:
        print(f"Pre-processing skipped or failed: {e}. Falling back to original model.")
        actual_input = input_model_path

    # 动态量化
    # 适合 YOLO 这种推理密集的模型
    print("Starting dynamic quantization to INT8...")
    quantize_dynamic(
        actual_input,
        output_model_path,
        weight_type=QuantType.QUInt8
    )
    
    # 清理预处理产生的临时文件
    if actual_input != input_model_path and os.path.exists(actual_input):
        os.remove(actual_input)
    
    print(f"Quantization finished. Output saved to {output_model_path}")
    
    # 比较文件大小
    input_size = os.path.getsize(input_model_path) / (1024 * 1024)
    output_size = os.path.getsize(output_model_path) / (1024 * 1024)
    print(f"Original size: {input_size:.2f} MB")
    print(f"Quantized size: {output_size:.2f} MB")
    print(f"Reduction: {(1 - output_size/input_size)*100:.1f}%")

if __name__ == "__main__":
    # 路径配置
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    model_dir = os.path.join(base_dir, "backend", "data", "models")
    
    input_model = os.path.join(model_dir, "yolov10-doclayout.onnx")
    output_model = os.path.join(model_dir, "yolov10-doclayout_int8.onnx")
    
    quantize_model(input_model, output_model)
