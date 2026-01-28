
import os
import sys
from PIL import Image, ImageDraw

# Add backend to sys.path
sys.path.append(os.getcwd())

from main import get_page_words

def create_dummy_image(path):
    img = Image.new('RGB', (800, 600), color='white')
    d = ImageDraw.Draw(img)
    # Use default font
    d.text((50, 50), "Start Anchor", fill=(0, 0, 0))
    d.text((200, 200), "Middle Anchor", fill=(0, 0, 0))
    d.text((400, 500), "End Anchor", fill=(0, 0, 0))
    img.save(path)

def test_ocr():
    img_path = "dummy_test_ocr.png"
    create_dummy_image(img_path)
    
    print(f"Testing OCR on {img_path}")
    try:
        words = get_page_words(img_path, page_idx=0, image_path=img_path)
        print(f"Found {len(words)} words:")
        for w in words:
            print(w)
            
        if len(words) > 0:
            print("SUCCESS: Words found.")
        else:
            print("FAILURE: No words found.")
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_ocr()
