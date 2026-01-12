from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import os
import uvicorn
import shutil
import hashlib
import json
import pdfplumber
from typing import List, Optional

# Local imports
from utils import pdf_to_images
from inference import get_layout_engine

app = FastAPI(title="HITL Document Extraction API")

# Storage paths
UPLOAD_DIR = "data/uploads"
TEMPLATES_DIR = "data/templates"

for d in [UPLOAD_DIR, TEMPLATES_DIR]:
    os.makedirs(d, exist_ok=True)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files to serve images
app.mount("/static", StaticFiles(directory=UPLOAD_DIR), name="static")

class Region(BaseModel):
    id: str
    type: str
    x: float
    y: float
    width: float
    height: float
    label: Optional[str] = None
    text: Optional[str] = None # For extracted text
    table_settings: Optional[dict] = None # For table-specific logic

class Template(BaseModel):
    id: str
    fingerprint: str
    name: str
    regions: List[Region]

def get_file_fingerprint(file_path):
    """
    In a real system, this would be more robust (e.g. key-point hashing).
    For POC, we use file hash as a proxy for the 'type' of document.
    """
    hasher = hashlib.md5()
    with open(file_path, 'rb') as f:
        buf = f.read()
        hasher.update(buf)
    return hasher.hexdigest()

def extract_text_from_regions(pdf_path, regions: List[Region]):
    """
    Uses pdfplumber to extract text from specific normalized coordinates.
    """
    results = []
    with pdfplumber.open(pdf_path) as pdf:
        first_page = pdf.pages[0]
        width, height = first_page.width, first_page.height
        
        for reg in regions:
            # Convert normalized to physical coordinates (x1, y1, x2, y2)
            bbox = (
                reg.x * width,
                reg.y * height,
                (reg.x + reg.width) * width,
                (reg.y + reg.height) * height
            )
            # Crop and extract
            cropped = first_page.within_bbox(bbox)
            text = cropped.extract_text()
            
            reg_dict = reg.dict()
            reg_dict["text"] = text.strip() if text else ""
            results.append(reg_dict)
            
    return results

@app.get("/")
async def root():
    return {"message": "HITL Document Extraction API is running"}

@app.post("/analyze")
async def analyze_document(
    file: UploadFile = File(...), 
    device: Optional[str] = None, 
    conf: float = 0.25
):
    # Save uploaded file
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # 1. Calculate Fingerprint
    fingerprint = get_file_fingerprint(file_path)
    
    # 2. Check for existing template (FINGERPRINT MATCH)
    template_found = False
    matching_regions = []
    
    # For re-identify calls, we might want to skip template match if specific params are sent
    # But for now, let's keep it simple.
    for t_file in os.listdir(TEMPLATES_DIR):
        if t_file.endswith(".json"):
            t_path = os.path.join(TEMPLATES_DIR, t_file)
            try:
                if os.path.getsize(t_path) == 0:
                    continue
                with open(t_path, "r", encoding="utf-8") as f:
                    t_data = json.load(f)
                    if t_data.get("fingerprint") == fingerprint:
                        template_found = True
                        regions_objs = [Region(**r) for r in t_data.get("regions", [])]
                        matching_regions = extract_text_from_regions(file_path, regions_objs)
                        break
            except Exception as e:
                print(f"Error checking template {t_file}: {e}")
                continue
    
    # 3. Convert to images
    img_subdir = f"images_{fingerprint[:8]}"
    img_save_path = os.path.join(UPLOAD_DIR, img_subdir)
    image_paths = pdf_to_images(file_path, img_save_path)
    relative_images = [os.path.join(img_subdir, os.path.basename(p)) for p in image_paths]

    # 4. Use AI (Apply frontend params)
    engine = get_layout_engine()
    try:
        # Override with layout inference even if template exists if we want to "re-identify"
        ai_regions = engine.predict(image_paths[0], device=device, conf=conf)
        if not template_found:
            matching_regions = ai_regions
    except Exception as e:
        print(f"Inference error: {e}")
        if not template_found:
            matching_regions = []
    
    return {
        "id": fingerprint[:12],
        "fingerprint": fingerprint,
        "filename": file.filename,
        "images": relative_images,
        "regions": matching_regions,
        "ai_regions": ai_regions if template_found else [], # Also send AI results for reference
        "template_found": template_found
    }

class TableAnalysisRequest(BaseModel):
    id: str
    filename: str
    region_id: str
    x: float
    y: float
    width: float
    height: float
    settings: Optional[dict] = None

@app.post("/table/analyze")
async def analyze_table_structure(req: TableAnalysisRequest):
    file_path = os.path.join(UPLOAD_DIR, req.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    try:
        with pdfplumber.open(file_path) as pdf:
            page = pdf.pages[0] 
            
            # Use original requested bbox directly to ensure stability
            orig_bbox = [
                req.x * float(page.width),
                req.y * float(page.height),
                (req.x + req.width) * float(page.width),
                (req.y + req.height) * float(page.height)
            ]
            
            bbox = tuple(orig_bbox)
            # Final safety check before crop
            if bbox[2] <= bbox[0] or bbox[3] <= bbox[1]:
                 raise ValueError(f"Invalid crop dimensions: {bbox}")

            cropped = page.crop(bbox)
            
            # Default or user-provided settings
            s = req.settings or {
                "vertical_strategy": "text",
                "horizontal_strategy": "text",
                "snap_tolerance": 3,
                "join_tolerance": 3,
            }
            
            # Find table using the requested strategy
            finder = cropped.debug_tablefinder(s)
            
            rows = []
            cols = []
            cells = []
            
            # Add safety for empty bbox delta
            bw = bbox[2] - bbox[0]
            bh = bbox[3] - bbox[1]
            if bw == 0 or bh == 0:
                raise ValueError("BBox width or height is zero")

            if finder.tables:
                table = finder.tables[0]
                # In pdfplumber, we can get separator lines from the finder or the table.
                # Table objects have 'cells' but for raw lines we want the finder's detected edges
                for edge in finder.edges:
                    if edge["orientation"] == "h":
                        rel_y = (edge["top"] - bbox[1]) / bh
                        if 0 <= rel_y <= 1: rows.append(rel_y)
                    elif edge["orientation"] == "v":
                        rel_x = (edge["x0"] - bbox[0]) / bw
                        if 0 <= rel_x <= 1: cols.append(rel_x)
                
                # Cells for Excel-like rendering
                for cell in table.cells:
                    cells.append({
                        "x": (cell[0] - bbox[0]) / bw,
                        "y": (cell[1] - bbox[1]) / bh,
                        "w": (cell[2] - cell[0]) / bw,
                        "h": (cell[3] - cell[1]) / bh
                    })
            
            rows = sorted(list(set([round(float(r), 4) for r in rows])))
            cols = sorted(list(set([round(float(c), 4) for c in cols])))
            
            # Ensure boundaries
            if not rows or rows[0] > 0.01: rows.insert(0, 0.0)
            if rows[-1] < 0.99: rows.append(1.0)
            if not cols or cols[0] > 0.01: cols.insert(0, 0.0)
            if cols[-1] < 0.99: cols.append(1.0)

            # Extract preview data
            table_data = cropped.extract_table(s)

            return {
                "rows": rows,
                "cols": cols,
                "cells": cells,
                "preview": table_data,
                "snapped_bbox": {
                    "x": orig_bbox[0] / float(page.width),
                    "y": orig_bbox[1] / float(page.height),
                    "width": (orig_bbox[2] - orig_bbox[0]) / float(page.width),
                    "height": (orig_bbox[3] - orig_bbox[1]) / float(page.height)
                }
            }
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        print(error_msg)
        with open("data/error.log", "a") as f:
            f.write(f"--- Error in /table/analyze ---\n{error_msg}\n")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/templates")
async def list_templates():
    templates = []
    if not os.path.exists(TEMPLATES_DIR):
        return []
    for t_file in os.listdir(TEMPLATES_DIR):
        if t_file.endswith(".json"):
            t_path = os.path.join(TEMPLATES_DIR, t_file)
            try:
                if os.path.getsize(t_path) == 0:
                    continue
                with open(t_path, "r", encoding="utf-8") as f:
                    templates.append(json.load(f))
            except Exception as e:
                print(f"Error loading template {t_file}: {e}")
    return templates

@app.post("/templates")
async def save_template(template: Template):
    template_path = os.path.join(TEMPLATES_DIR, f"{template.id}.json")
    with open(template_path, "w", encoding="utf-8") as f:
        # Use Pydantic v2 compatible JSON export
        f.write(template.model_dump_json(indent=2))
    return {"status": "success", "id": template.id}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
