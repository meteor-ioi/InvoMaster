import fitz  # PyMuPDF
import os
from PIL import Image
import io

def pdf_to_images(pdf_path, output_dir, dpi=200, target_long_side=4000, max_px=8000):
    """
    Converts PDF pages to images with adaptive DPI.
    Targeting a specific pixel count for the long side to ensure OCR accuracy
    regardless of physical PDF dimensions (A4 vs A0).
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    doc = fitz.open(pdf_path)
    image_paths = []
    
    for i in range(len(doc)):
        page = doc.load_page(i)
        rect = page.rect
        w_pt, h_pt = rect.width, rect.height
        long_side_pt = max(w_pt, h_pt)
        
        # Calculate adaptive DPI
        # pdfplumber/fitz default is 72 points per inch
        # Goal: long_side_pt * (dpi / 72) = target_long_side
        adaptive_dpi = (target_long_side / long_side_pt) * 72
        
        # Ensure it's at least the requested DPI (default 200) for small pages
        # but don't go too crazy to avoid OOM
        final_dpi = max(dpi, min(600, adaptive_dpi))
        
        # Final safety check against max_px
        if (long_side_pt * final_dpi / 72) > max_px:
            final_dpi = (max_px / long_side_pt) * 72
            
        matrix = fitz.Matrix(final_dpi / 72, final_dpi / 72)
        pix = page.get_pixmap(matrix=matrix)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        
        img_filename = f"page_{i+1}.png"
        img_path = os.path.join(output_dir, img_filename)
        img.save(img_path)
        image_paths.append(img_path)
        
    doc.close()
    return image_paths
