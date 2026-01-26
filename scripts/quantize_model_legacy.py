import os
import onnx
from onnxruntime.quantization import quantize_dynamic, QuantType

def quantize_model(input_model_path, output_model_path):
    print(f"Loading model from {input_model_path}...")
    
    if not os.path.exists(input_model_path):
        print(f"Error: Input model {input_model_path} not found.")
        return

    # 棰勫鐞嗙涓€姝ワ細浣跨敤 onnxsim 绠€鍖栨ā鍨嬶紙瑙ｅ喅 Windows 涓嬪父瑙佺殑 Initializer 閿欒锛?    print("Starting pre-processing with onnxsim...")
    simplified_path = input_model_path.replace(".onnx", "_sim.onnx")
    try:
        import onnxsim
        model = onnx.load(input_model_path)
        model_simp, check = onnxsim.simplify(model)
        if check:
            onnx.save(model_simp, simplified_path)
            actual_input = simplified_path
            print(f"onnxsim simplification finished. Using {simplified_path} for next steps.")
        else:
            print("onnxsim check failed, skipping simplification.")
            actual_input = input_model_path
    except Exception as e:
        print(f"onnxsim failed: {e}. Falling back to original model.")
        actual_input = input_model_path

    # 棰勫鐞嗙浜屾锛歄NNX Runtime 瀹樻柟棰勫鐞?    print("Starting pre-processing with quant_pre_process...")
    pre_processed_path = actual_input.replace(".onnx", "_pre.onnx")
    from onnxruntime.quantization import quant_pre_process
    try:
        quant_pre_process(actual_input, pre_processed_path)
        # 濡傛灉鐢熸垚浜嗘柊鏂囦欢涓斾笉绛変簬 input_model_path
        if os.path.exists(pre_processed_path):
            # 濡傛灉涔嬪墠鏈?simp 鏂囦欢锛屽彲浠ユ竻鐞嗗畠锛堥櫎闈炲畠灏辨槸 input_model锛?            if actual_input != input_model_path and os.path.exists(actual_input):
                os.remove(actual_input)
            actual_input = pre_processed_path
            print(f"quant_pre_process finished. Using {pre_processed_path} for quantization.")
    except Exception as e:
        print(f"quant_pre_process skipped or failed: {e}. Using current actual_input.")

    # 鍔ㄦ€侀噺鍖?    # 閫傚悎 YOLO 杩欑鎺ㄧ悊瀵嗛泦鐨勬ā鍨?    print(f"Starting dynamic quantization to INT8 using input: {actual_input}")
    quantize_dynamic(
        actual_input,
        output_model_path,
        weight_type=QuantType.QUInt8
    )
    
    # 娓呯悊棰勫鐞嗕骇鐢熺殑涓存椂鏂囦欢
    if actual_input != input_model_path and os.path.exists(actual_input):
        os.remove(actual_input)
    
    print(f"Quantization finished. Output saved to {output_model_path}")
    
    # 姣旇緝鏂囦欢澶у皬
    input_size = os.path.getsize(input_model_path) / (1024 * 1024)
    output_size = os.path.getsize(output_model_path) / (1024 * 1024)
    print(f"Original size: {input_size:.2f} MB")
    print(f"Quantized size: {output_size:.2f} MB")
    print(f"Reduction: {(1 - output_size/input_size)*100:.1f}%")

if __name__ == "__main__":
    # 璺緞閰嶇疆
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    model_dir = os.path.join(base_dir, "backend", "data", "models")
    
    input_model = os.path.join(model_dir, "yolov10-doclayout.onnx")
    output_model = os.path.join(model_dir, "yolov10-doclayout_int8.onnx")
    
    quantize_model(input_model, output_model)
