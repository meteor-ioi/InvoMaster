import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

import inference
import ocr_utils # Potential conflict source?
from utils import pdf_to_images
import tempfile

def test_inference():
    print("Initializing LayoutEngine...")
    try:
        engine = inference.get_layout_engine()
        print("Model loaded.")
    except Exception as e:
        print(f"FAILED to load model: {e}")
        return

    pdf_path = os.path.join(os.path.dirname(__file__), '..', 'dummy_test.pdf')
    if not os.path.exists(pdf_path):
        print(f"PDF not found: {pdf_path}")
        return

    print(f"Processing PDF: {pdf_path}")
    with tempfile.TemporaryDirectory() as temp_dir:
        image_paths = pdf_to_images(pdf_path, temp_dir)
        if not image_paths:
            print("Failed to convert PDF to images.")
            return

        print(f"Generated {len(image_paths)} images.")
        img_path = image_paths[0]
        
        print("Running prediction...")
        try:
            regions = engine.predict(img_path)
            print(f"Success! {len(regions)} regions found.")
            print(regions)
        except Exception as e:
            print(f"CRASH during prediction: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_inference()
