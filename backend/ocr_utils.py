"""
OCR Utilities for handling scanned (image-based) PDFs.

This module provides functionality to:
1. Run RapidOCR on page images
2. Convert OCR results (pixel coordinates) to pdfplumber-compatible 'char' objects
3. Inject these objects into a pdfplumber page to enable table extraction
"""

from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from PIL import Image

# Lazy load RapidOCR to avoid import overhead if not used
_ocr_engine = None

def get_ocr_engine():
    """Get or initialize the RapidOCR engine (singleton)."""
    global _ocr_engine
    if _ocr_engine is None:
        try:
            from rapidocr_onnxruntime import RapidOCR
            _ocr_engine = RapidOCR()
            print("RapidOCR engine initialized successfully.")
        except ImportError as e:
            print(f"Failed to import RapidOCR: {e}")
            raise
    return _ocr_engine


def run_ocr_on_image(image_path: str) -> List[Tuple[List[List[float]], str, float]]:
    """
    Run OCR on an image file.
    
    Args:
        image_path: Path to the image file.
        
    Returns:
        List of tuples: (box_coordinates, text, confidence)
        box_coordinates is [[x1,y1], [x2,y1], [x2,y2], [x1,y2]] in pixels.
    """
    engine = get_ocr_engine()
    result, _ = engine(image_path)
    
    if result is None:
        return []
    
    return result


def ocr_box_to_pdfplumber_chars(
    box: List[List[float]], 
    text: str, 
    confidence: float,
    scale_x: float,
    scale_y: float,
    pdf_height: float,
    x0_offset: float = 0,
    y0_offset: float = 0
) -> List[Dict[str, Any]]:
    """
    Convert a single OCR result box to a list of pdfplumber-compatible 'char' dictionaries.
    Specifically splits the string into individual character objects to help pdfplumber
    strategies like 'text' find column/row boundaries.
    """
    # box format: [[x1,y1], [x2,y1], [x2,y2], [x1,y2]]
    x_coords = [pt[0] for pt in box]
    y_coords = [pt[1] for pt in box]
    
    x0_px = min(x_coords)
    x1_px = max(x_coords)
    y0_px = min(y_coords)
    y1_px = max(y_coords)
    
    # Convert to PDF coordinates (points)
    x0_total = x0_offset + (x0_px * scale_x)
    x1_total = x0_offset + (x1_px * scale_x)
    top = y0_offset + (y0_px * scale_y)
    bottom = y0_offset + (y1_px * scale_y)
    height = bottom - top
    width_total = x1_total - x0_total
    
    # Heuristic size (font size)
    size = height * 0.8  # Approximation
    
    chars = []
    num_chars = len(text)
    if num_chars == 0:
        return []
        
    char_width = width_total / num_chars if num_chars > 0 else 0
    if char_width <= 0:
        char_width = 1.0 
    
    for i, char_text in enumerate(text):
        c_x0 = x0_total + (i * char_width)
        c_x1 = c_x0 + char_width
        
        chars.append({
            "text": char_text,
            "x0": c_x0,
            "x1": c_x1,
            "top": top,
            "bottom": bottom,
            # For y0/y1 (y-up), we calculate from bottom edge
            # This is a bit complex with offsets, so we use top/bottom primarily
            "y0": (y0_offset + pdf_height) - bottom,
            "y1": (y0_offset + pdf_height) - top,
            "width": char_width,
            "height": height,
            "size": size,
            "adv": char_width,
            "doctop": top, # For single page, doctop == top
            "object_type": "char",
            "upright": True,
            "direction": 1,
            "fontname": "OCR-Default",
            "_ocr_confidence": confidence,
        })
    
    return chars


def get_ocr_chars_for_page(
    image_path: str,
    pdf_width: float,
    pdf_height: float,
    page_bbox: Tuple[float, float, float, float] = (0, 0, 0, 0)
) -> List[Dict[str, Any]]:
    """
    Run OCR on a page image and return pdfplumber-compatible char objects.
    """
    # Get image dimensions
    with Image.open(image_path) as img:
        img_width, img_height = img.size
    
    # Calculate scale factors
    scale_x = pdf_width / img_width
    scale_y = pdf_height / img_height
    
    # Run OCR
    ocr_results = run_ocr_on_image(image_path)
    
    # Offsets from page bbox
    x0_off, y0_off = page_bbox[0], page_bbox[1]
    
    # Convert to pdfplumber format
    all_chars = []
    for box, text, confidence in ocr_results:
        char_objs = ocr_box_to_pdfplumber_chars(
            box, text, confidence, scale_x, scale_y, pdf_height, x0_off, y0_off
        )
        all_chars.extend(char_objs)
    
    print(f"OCR detected {len(all_chars)} characters from {image_path}")
    return all_chars


def inject_ocr_chars_to_page(page, chars: List[Dict[str, Any]]):
    """
    Inject OCR-derived char objects into a pdfplumber page.
    
    This modifies the page object in-place to make it appear as if
    it contains real text objects.
    
    Args:
        page: A pdfplumber Page object.
        chars: List of char dictionaries from get_ocr_chars_for_page.
    """
    # Clear cached objects and inject new chars
    # pdfplumber uses _objects internally to cache extracted objects
    if hasattr(page, '_objects'):
        if page._objects is None:
            page._objects = {}
        page._objects['char'] = chars
    else:
        # Create _objects if it doesn't exist
        page._objects = {'char': chars}
    
    print(f"Injected {len(chars)} OCR chars into pdfplumber page")


def is_page_scanned(page, threshold: int = 5) -> bool:
    """
    Heuristic to determine if a PDF page is scanned (image-only).
    
    Args:
        page: A pdfplumber Page object.
        threshold: Minimum number of chars to consider it a text PDF.
        
    Returns:
        True if the page appears to be scanned (few/no text objects).
    """
    try:
        char_count = len(page.chars) if page.chars else 0
        return char_count < threshold
    except Exception:
        return True  # Assume scanned if we can't read chars
