import torch
import os
# Try to import from doclayout_yolo first, which handles YOLOv10 architecture correctly
try:
    from doclayout_yolo import YOLOv10 as YOLO
except ImportError:
    from ultralytics import YOLO

def get_device(force_mps=False):
    """
    Detects the best available device (MPS, CUDA, or CPU).
    M4 Mac supports MPS.
    """
    if force_mps and torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"

class LayoutEngine:
    def __init__(self, model_path="data/models/yolov10-doclayout.pt", device=None):
        if not os.path.exists(model_path):
            # Fallback to standard yolov8n if doclayout is missing during first run
            print(f"Warning: {model_path} not found. Using fallback model.")
            model_path = "yolov8n.pt"
            
        self.device = device or get_device()
        print(f"Initializing LayoutEngine on device: {self.device}")
        try:
            self.model = YOLO(model_path)
        except Exception as e:
            print(f"Failed to load model {model_path}: {e}")
            # Final fallback to standard YOLO
            from ultralytics import YOLO as StandardYOLO
            self.model = StandardYOLO(model_path)

    def predict(self, image_path, device=None, conf=0.25, imgsz=1024, iou=0.45, agnostic_nms=False):
        """
        Predict layout regions for a single image with custom parameters.
        """
        target_device = device or self.device
        print(f"Running prediction on {target_device} (conf={conf}, imgsz={imgsz}, iou={iou}, agnostic_nms={agnostic_nms})")
        
        results = self.model.predict(
            image_path, 
            device=target_device, 
            conf=conf,
            imgsz=imgsz,
            iou=iou,
            agnostic_nms=agnostic_nms
        )
        regions = []
        
        # DocLayout-YOLO classes
        for i, r in enumerate(results[0].boxes):
            box = r.xyxyn[0].tolist() 
            cls = int(r.cls[0])
            label = self.model.names[cls]
            
            x1, y1, x2, y2 = box
            regions.append({
                "id": f"auto_{i}",
                "type": label.lower(),
                "x": x1,
                "y": y1,
                "width": x2 - x1,
                "height": y2 - y1,
                "label": label
            })
            
        print(f"Detected {len(regions)} regions in {image_path}")
        return regions

# Global instance for shared use
_engine = None

def get_layout_engine():
    global _engine
    if _engine is None:
        _engine = LayoutEngine()
    return _engine
