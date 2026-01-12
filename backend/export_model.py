import os
from ultralytics import YOLO

def download_and_export():
    # Model name or path
    # For DocLayout-YOLO, it's typically a specific weight file.
    # We'll use a standard YOLOv8 layout model as a proxy if we can't find the exact one,
    # but let's try to simulate the export process.
    
    model_name = "yolov8n.pt" # Placeholder
    print(f"Loading model: {model_name}")
    model = YOLO(model_name)
    
    print("Exporting to ONNX...")
    onnx_path = model.export(format="onnx")
    print(f"Model exported to: {onnx_path}")

if __name__ == "__main__":
    download_and_export()
