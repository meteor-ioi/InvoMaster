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
    
    # Fast path: check if images already exist before opening PDF
    # This assumes we want all pages. If we need page count, we must open.
    # However, for performance, we can open once and cache the count if needed, 
    # but here we'll just check if page_1.png exists as a heuristic or better, 
    # open the doc once to get count.
    
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    
    image_paths = []
    all_exist = True
    for i in range(total_pages):
        img_path = os.path.join(output_dir, f"page_{i+1}.png")
        if not os.path.exists(img_path) or os.path.getsize(img_path) == 0:
            all_exist = False
            break
        image_paths.append(img_path)
        
    if all_exist and len(image_paths) == total_pages:
        doc.close()
        # print(f"Using existing images in {output_dir}")
        return image_paths

    # Reset image_paths and do actual conversion
    image_paths = []
    for i in range(total_pages):
        img_filename = f"page_{i+1}.png"
        img_path = os.path.join(output_dir, img_filename)
        
        if os.path.exists(img_path) and os.path.getsize(img_path) > 0:
            image_paths.append(img_path)
            continue
            
        page = doc.load_page(i)
        rect = page.rect
        w_pt, h_pt = rect.width, rect.height
        long_side_pt = max(w_pt, h_pt)
        
        adaptive_dpi = (target_long_side / long_side_pt) * 72
        final_dpi = max(dpi, min(600, adaptive_dpi))
        
        if (long_side_pt * final_dpi / 72) > max_px:
            final_dpi = (max_px / long_side_pt) * 72
            
        matrix = fitz.Matrix(final_dpi / 72, final_dpi / 72)
        pix = page.get_pixmap(matrix=matrix)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        
        img.save(img_path)
        image_paths.append(img_path)
        
    doc.close()
    return image_paths
