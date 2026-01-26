import os
import onnx
from onnxruntime.quantization import quantize_dynamic, QuantType

def quantize_model(input_model_path, output_model_path):
    print(f"Loading model from {input_model_path}...")
    
    if not os.path.exists(input_model_path):
        print(f"Error: Input model {input_model_path} not found.")
        return

    # 预处理第一步：使用 onnxsim 简化模型（解决 Windows 下常见的 Initializer 错误）
    print("Starting pre-processing with onnxsim...")
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

    # 预处理第二步：ONNX Runtime 官方预处理
    print("Starting pre-processing with quant_pre_process...")
    pre_processed_path = actual_input.replace(".onnx", "_pre.onnx")
    from onnxruntime.quantization import quant_pre_process
    try:
        quant_pre_process(actual_input, pre_processed_path)
        # 如果生成了新文件且不等于 input_model_path
        if os.path.exists(pre_processed_path):
            # 如果之前有 simp 文件，可以清理它（除非它就是 input_model）
            if actual_input != input_model_path and os.path.exists(actual_input):
                os.remove(actual_input)
            actual_input = pre_processed_path
            print(f"quant_pre_process finished. Using {pre_processed_path} for quantization.")
    except Exception as e:
        print(f"quant_pre_process skipped or failed: {e}. Using current actual_input.")

    # 动态量化
    # 适合 YOLO 这种推理密集的模型
    print(f"Starting dynamic quantization to INT8 using input: {actual_input}")
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
