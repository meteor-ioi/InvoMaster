import os
import json
from fingerprint import engine
from inference import DOCLAYOUT_CLASSES

def dump_boxes(file_path):
    print(f"\n--- Detailed Boxes for: {os.path.basename(file_path)} ---")
    features = engine.extract_features(file_path)
    boxes = features.get("layout_boxes", [])
    
    print(f"Total Boxes: {len(boxes)}")
    print(f"{'Index':<5} | {'ClassID':<7} | {'Label':<15} | {'Y_center':<10} | {'Area':<10}")
    print("-" * 60)
    for i, b in enumerate(boxes):
        cls_id = b[0]
        y_center = b[2]
        area = b[3] * b[4]
        label = DOCLAYOUT_CLASSES.get(cls_id, "unknown")
        print(f"{i:<5} | {cls_id:<7} | {label:<15} | {y_center:<10.4f} | {area:<10.4f}")
    
    sig = engine._get_layout_signature(boxes)
    print(f"\nFinal Signature (Collapsed): {sig}")

if __name__ == "__main__":
    f1 = "/Users/icychick/Projects/industry_PDF/PDF测试汇总/同类型-3 组/3-1.PDF"
    f2 = "/Users/icychick/Projects/industry_PDF/PDF测试汇总/同类型-3 组/3-2.PDF"
    
    dump_boxes(f1)
    dump_boxes(f2)
