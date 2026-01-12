import fitz  # PyMuPDF
import os
from PIL import Image
import io

def pdf_to_images(pdf_path, output_dir, dpi=200):
    """
    Converts PDF pages to images.
    Returns a list of image paths.
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    doc = fitz.open(pdf_path)
    image_paths = []
    
    for i in range(len(doc)):
        page = doc.load_page(i)
        pix = page.get_pixmap(matrix=fitz.Matrix(dpi/72, dpi/72))
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        
        img_filename = f"page_{i+1}.png"
        img_path = os.path.join(output_dir, img_filename)
        img.save(img_path)
        image_paths.append(img_path)
        
    doc.close()
    return image_paths
