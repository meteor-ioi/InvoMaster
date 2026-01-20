import os
import tempfile
from inference import get_layout_engine
from utils import pdf_to_images

def test_conf(file_path, conf_levels=[0.05, 0.1, 0.25]):
    engine = get_layout_engine()
    
    with tempfile.TemporaryDirectory() as temp_dir:
        image_paths = pdf_to_images(file_path, temp_dir, dpi=200)
        if not image_paths:
            return
        
        img = image_paths[0]
        print(f"\n--- Testing Confidence Levels for {os.path.basename(file_path)} ---")
        for conf in conf_levels:
            regions = engine.predict(img, conf=conf, imgsz=1024)
            print(f"Conf {conf}: Detected {len(regions)} regions")
            for r in regions:
                print(f"  {r['type']} at y={r['y']:.3f}, w={r['width']:.3f}")

if __name__ == "__main__":
    f = "/Users/icychick/Projects/industry_PDF/PDF测试汇总/同类型-3 组/3-1.PDF"
    test_conf(f)
