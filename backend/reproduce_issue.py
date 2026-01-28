
import fitz
import os
from PIL import Image

# Create a dummy PNG
img = Image.new('RGB', (100, 100), color='red')
img.save('test.png')

# Rename to .pdf
if os.path.exists('test.pdf'):
    os.remove('test.pdf')
os.rename('test.png', 'test.pdf')

try:
    doc = fitz.open('test.pdf')
    print("Success: fitz opened the PNG-as-PDF")
    print(f"Page count: {len(doc)}")
    
    for i in range(len(doc)):
        page = doc.load_page(i)
        rect = page.rect
        print(f"Page {i} rect: {rect}")
        
        pix = page.get_pixmap()
        print(f"Page {i} pixmap: {pix}")
        
except Exception as e:
    print(f"Failure in processing: {e}")

# Cleanup
if os.path.exists('test.pdf'):
    os.remove('test.pdf')
