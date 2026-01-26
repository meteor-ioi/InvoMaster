import os
from PIL import Image
from fastapi import APIRouter, HTTPException
from typing import Optional
import logging

logger = logging.getLogger("backend.anchor_capture")

router = APIRouter()

# Directories will be inherited or passed from main
UPLOAD_DIR = None 

def init_anchor_capture(upload_dir):
    global UPLOAD_DIR
    UPLOAD_DIR = upload_dir
    # Ensure anchors directory exists
    anchors_dir = os.path.join(UPLOAD_DIR, "anchors")
    os.makedirs(anchors_dir, exist_ok=True)

@router.post("/capture_anchor_image")
async def capture_anchor_image(data: dict):
    """
    Captures a sub-image from a page image based on normalized coordinates.
    Expects: { filename: str, x: float, y: float, w: float, h: float, page_idx: int }
    """
    filename = data.get("filename")
    x_norm = data.get("x")
    y_norm = data.get("y")
    w_norm = data.get("w")
    h_norm = data.get("h")
    page_idx = data.get("page_idx", 0)

    if not all([filename, x_norm is not None, y_norm is not None, w_norm is not None, h_norm is not None]):
        raise HTTPException(status_code=400, detail="Missing required parameters")

    # Find the source image (usually generated during analysis)
    # We expect images to be in a subdirectory like images_{fingerprint[:8]}
    # But for simplicity, we search for the image based on filename and common subdirs
    
    # We need the full path to the image
    # Note: main.py generates images in UPLOAD_DIR/images_{fingerprint[:8]}
    # The frontend knows the path because it's in analysis.images[0]
    
    # Let's assume the frontend passes the relative image path instead of just filename
    source_rel_path = data.get("source_image_path") # e.g. "images_abc123/page1.png"
    if not source_rel_path:
        # Fallback search (less reliable)
        raise HTTPException(status_code=400, detail="source_image_path is required")

    source_full_path = os.path.join(UPLOAD_DIR, source_rel_path)
    if not os.path.exists(source_full_path):
        raise HTTPException(status_code=404, detail=f"Source image {source_rel_path} not found")

    try:
        with Image.open(source_full_path) as img:
            img_w, img_h = img.size
            
            # Use a slightly larger crop to ensure template matching has context?
            # User wants precise, but template matching needs some edges.
            # We'll just use the provided bbox for now.
            left = x_norm * img_w
            top = y_norm * img_h
            right = (x_norm + w_norm) * img_w
            bottom = (y_norm + h_norm) * img_h
            
            # Crop
            anchor_img = img.crop((left, top, right, bottom))
            
            # Generate unique name
            import hashlib
            import time
            name_base = f"{filename}_{x_norm}_{y_norm}_{time.time()}"
            name_hash = hashlib.md5(name_base.encode()).hexdigest()[:12]
            anchor_filename = f"anchor_{name_hash}.png"
            
            anchors_dir = os.path.join(UPLOAD_DIR, "anchors")
            save_path = os.path.join(anchors_dir, anchor_filename)
            anchor_img.save(save_path)
            
            return {
                "success": True,
                "image_ref": os.path.join("anchors", anchor_filename)
            }
    except Exception as e:
        logger.error(f"Error capturing anchor image: {e}")
        raise HTTPException(status_code=500, detail=str(e))
