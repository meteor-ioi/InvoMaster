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
from database import db # SQLite integration
from fingerprint import engine as fp_engine # Enhanced Fingerprinting

app = FastAPI(title="HITL Document Extraction API")

# Storage paths
UPLOAD_DIR = "data/uploads"
TEMPLATES_DIR = "data/templates" # Root dir
TEMPLATES_AUTO_DIR = "data/templates/auto"
TEMPLATES_CUSTOM_DIR = "data/templates/custom"
TEMPLATES_SOURCE_DIR = "data/template_sources"

for d in [UPLOAD_DIR, TEMPLATES_DIR, TEMPLATES_AUTO_DIR, TEMPLATES_CUSTOM_DIR, TEMPLATES_SOURCE_DIR]:
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
    remarks: Optional[str] = None # Added: User notes
    text: Optional[str] = None # For extracted text
    table_settings: Optional[dict] = None # For table-specific logic

class ExtractRequest(BaseModel):
    template_id: str
    file_name: Optional[str] = None # Used for logging

class HistoryItem(BaseModel):
    timestamp: str
    filename: str
    template_name: str
    result_summary: dict


class Template(BaseModel):
    id: str
    mode: str = "auto" # 'auto' or 'custom'
    fingerprint: Optional[str] = None # Required for auto, optional for custom
    fingerprint_text: Optional[str] = None # Added: Cached text features
    name: str
    regions: List[Region]
    tags: List[str] = [] # Added for metadata
    filename: Optional[str] = None

HISTORY_FILE = "data/history.jsonl"

def append_history(item: dict):
    with open(HISTORY_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(item, ensure_ascii=False) + "\n")

def read_history(limit: int = 50):
    if not os.path.exists(HISTORY_FILE):
        return []
    lines = []
    with open(HISTORY_FILE, "r", encoding="utf-8") as f:
        lines = f.readlines()
    # Return last N lines reversed
    return [json.loads(line) for line in reversed(lines[-limit:])]

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
    conf: float = 0.25,
    imgsz: int = 1024,
    iou: float = 0.45,
    agnostic_nms: bool = False,
    refresh: bool = False
):
    # Save uploaded file
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # 1. Calculate Fingerprint
    fingerprint = get_file_fingerprint(file_path)
    
    # 2. Check for existing template (ENHANCED MATCH - AUTO MODE ONLY)
    template_found = False
    matching_regions = []
    matched_template_info = None
    
    if not refresh:
        # Get all candidates
        candidates = db.get_all_auto_templates()
        if candidates:
            # Match using engine
            match_cand, score = fp_engine.find_best_match(file_path, candidates, threshold=0.85)
            
            if match_cand:
                print(f"Matched template {match_cand['id']} with score {score}")
                t_path = os.path.join(TEMPLATES_AUTO_DIR, f"{match_cand['id']}.json")
                if os.path.exists(t_path):
                     try:
                        with open(t_path, "r", encoding="utf-8") as f:
                            t_data = json.load(f)
                            template_found = True
                            matched_template_info = match_cand
                            # Apply regions to current file
                            regions_objs = [Region(**r) for r in t_data.get("regions", [])]
                            matching_regions = extract_text_from_regions(file_path, regions_objs)
                     except Exception as e:
                         print(f"Error loading matched template {match_cand['id']}: {e}")
            else:
                print("No template matched (score too low)")
    
    # 3. Convert to images
    img_subdir = f"images_{fingerprint[:8]}"
    img_save_path = os.path.join(UPLOAD_DIR, img_subdir)
    image_paths = pdf_to_images(file_path, img_save_path)
    relative_images = [os.path.join(img_subdir, os.path.basename(p)) for p in image_paths]

    # 4. Use AI (Apply frontend params)
    engine = get_layout_engine()
    try:
        # Override with layout inference even if template exists if we want to "re-identify"
        ai_regions = engine.predict(
            image_paths[0], 
            device=device, 
            conf=conf,
            imgsz=imgsz,
            iou=iou,
            agnostic_nms=agnostic_nms
        )
        # If refreshing or no template found, use AI results
        if refresh or not template_found:
            matching_regions = ai_regions
            if refresh:
                template_found = False # Reset flag for UI feedback
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
        "ai_regions": ai_regions if template_found else [], 
        "template_found": template_found,
        "matched_template": matched_template_info,
        "is_source": False
    }

@app.get("/templates/{template_id}/analyze")
async def analyze_from_source(template_id: str):
    """
    Re-analyze a document using the preserved source PDF in the library.
    """
    # 1. Look for the source file
    source_path = os.path.join(TEMPLATES_SOURCE_DIR, f"{template_id}.pdf")
    if not os.path.exists(source_path):
        # Fallback to check if a template exists and try to find its recorded filename in uploads (less reliable)
        t_path = os.path.join(TEMPLATES_DIR, f"{template_id}.json")
        if not os.path.exists(t_path):
            raise HTTPException(status_code=404, detail="Template not found")
        with open(t_path, "r", encoding="utf-8") as f:
            t_data = json.load(f)
            filename = t_data.get("filename")
            source_path = os.path.join(UPLOAD_DIR, filename) if filename else None
            
        if not source_path or not os.path.exists(source_path):
            raise HTTPException(status_code=404, detail="Template source file not found in library or uploads")

    # 2. Get fingerprint
    fingerprint = get_file_fingerprint(source_path)
    
    # 3. Convert to images (as usual)
    img_subdir = f"images_{fingerprint[:8]}"
    img_save_path = os.path.join(UPLOAD_DIR, img_subdir)
    image_paths = pdf_to_images(source_path, img_save_path)
    relative_images = [os.path.join(img_subdir, os.path.basename(p)) for p in image_paths]

    # 4. Load template regions
    # 4. Load template regions
    # Determine path based on DB or try both
    t_record = db.get_template(template_id)
    if t_record:
        mode_dir = TEMPLATES_AUTO_DIR if t_record['mode'] == 'auto' else TEMPLATES_CUSTOM_DIR
        t_path = os.path.join(mode_dir, f"{template_id}.json")
    else:
        # Fallback for old system or missing DB record
        t_path = os.path.join(TEMPLATES_DIR, f"{template_id}.json")
        if not os.path.exists(t_path):
             # Try subdirs explicitly if DB missed it
             if os.path.exists(os.path.join(TEMPLATES_AUTO_DIR, f"{template_id}.json")):
                 t_path = os.path.join(TEMPLATES_AUTO_DIR, f"{template_id}.json")
             elif os.path.exists(os.path.join(TEMPLATES_CUSTOM_DIR, f"{template_id}.json")):
                 t_path = os.path.join(TEMPLATES_CUSTOM_DIR, f"{template_id}.json")

    with open(t_path, "r", encoding="utf-8") as f:
        t_data = json.load(f)
        regions_objs = [Region(**r) for r in t_data.get("regions", [])]
        matching_regions = extract_text_from_regions(source_path, regions_objs)

    return {
        "id": template_id,
        "fingerprint": fingerprint,
        "filename": t_data.get("filename", f"{template_id}.pdf"),
        "images": relative_images,
        "regions": matching_regions,
        "template_found": True,
        "is_source": True,
        "mode": t_record['mode'] if t_record else 'unknown'
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

            # Handle explicit lines conversion (Front-end sends 0-1 relative coords)
            # pdfplumber expects explicit lines in absolute page coordinates
            if s.get("vertical_strategy") == "explicit":
                # Convert relative X to absolute Page X
                rel_cols = s.get("explicit_vertical_lines", [])
                abs_cols = [bbox[0] + (c * (bbox[2] - bbox[0])) for c in rel_cols]
                s["explicit_vertical_lines"] = abs_cols
            
            if s.get("horizontal_strategy") == "explicit":
                # Convert relative Y to absolute Page Y
                rel_rows = s.get("explicit_horizontal_lines", [])
                abs_rows = [bbox[1] + (r * (bbox[3] - bbox[1])) for r in rel_rows]
                s["explicit_horizontal_lines"] = abs_rows
            
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
async def list_templates(mode: Optional[str] = None, tag: Optional[str] = None):
    return db.list_templates(mode=mode, tag=tag)

@app.post("/templates")
async def save_template(template: Template):
    # 1. Determine storage path
    # Default to auto if not specified (backward compatibility)
    mode = template.mode if template.mode in ['auto', 'custom'] else 'auto'
    
    target_dir = TEMPLATES_AUTO_DIR if mode == 'auto' else TEMPLATES_CUSTOM_DIR
    template_path = os.path.join(target_dir, f"{template.id}.json")
    
    # Extract features if auto mode or if requested (actually always good to have)
    # Be careful: template.filename is the UPLOADED source file path, which might be in uploads
    # We need that file to extract features. 
    # Front-end sends 'filename' which is relative to UPLOAD_DIR usually.
    
    f_features = {}
    if template.filename:
        src_full_path = os.path.join(UPLOAD_DIR, template.filename)
        if os.path.exists(src_full_path):
            f_features = fp_engine.extract_features(src_full_path)
    
    # 2. Save JSON definition
    # Update template object with extracted features so it is also in the JSON
    template.fingerprint_text = json.dumps(f_features)
    
    with open(template_path, "w", encoding="utf-8") as f:
        f.write(template.model_dump_json(indent=2))
        
    # 3. Save to DB
    db.save_template(
        t_id=template.id,
        mode=mode,
        name=template.name,
        filename=template_path,
        fingerprint=template.fingerprint,
        fingerprint_text=json.dumps(f_features),
        tags=template.tags
    )
    
    # 4. Preserved PDF source library
    if template.filename:
        # Check if it already exists in source library
        dest_filename = f"{template.id}.pdf"
        dest_path = os.path.join(TEMPLATES_SOURCE_DIR, dest_filename)
        
        if not os.path.exists(dest_path):
            # Try to copy from uploads
            src_path = os.path.join(UPLOAD_DIR, template.filename)
            if os.path.exists(src_path):
                shutil.copy2(src_path, dest_path)
                print(f"Archived template source: {dest_path}")
            else:
                pass

    return {"status": "success", "id": template.id, "mode": mode}

@app.post("/extract/{template_id}")
async def extract_with_custom_template(
    template_id: str,
    file: UploadFile = File(...)
):
    """
    CUSTOM MODE: Explicitly apply a template to an uploaded file, ignoring fingerprint.
    """
    # 1. Look up template
    t_record = db.get_template(template_id)
    if not t_record:
        raise HTTPException(status_code=404, detail="Template not found in DB")
        
    mode_dir = TEMPLATES_AUTO_DIR if t_record['mode'] == 'auto' else TEMPLATES_CUSTOM_DIR
    t_path = os.path.join(mode_dir, f"{template_id}.json")
    
    if not os.path.exists(t_path):
        raise HTTPException(status_code=404, detail="Template definition file missing")
        
    with open(t_path, "r", encoding="utf-8") as f:
        t_data = json.load(f)
        
    try:
        # 2. Save Uploaded File for processing
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 3. Extract using forced regions
        regions_objs = [Region(**r) for r in t_data.get("regions", [])]
        extracted_regions = extract_text_from_regions(file_path, regions_objs)
        
        # 4. Format Output Structure
        result_map = {}
        for r in extracted_regions:
            key = r.get("label") or r.get("id")
            result_map[key] = r.get("text", "")
            
        # 5. Log History
        import datetime
        timestamp = datetime.datetime.now().isoformat()
        append_history({
            "timestamp": timestamp,
            "filename": file.filename,
            "template_name": t_data.get("name", "Unknown"),
            "template_id": template_id,
            "mode": "custom_forced",
            "result_summary": result_map
        })
            
        return {
            "status": "success",
            "filename": file.filename,
            "template_name": t_data.get("name"),
            "mode": t_record['mode'],
            "data": result_map,
            "raw_regions": extracted_regions
        }
        
    except Exception as e:
        print(f"Extraction error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/extract")
async def extract_from_template_legacy(
    template_id: str,
    file: UploadFile = File(...)
):
    # Deprecated or strictly Auto-mode compatible
    # Forward to new handler for now
    return await extract_with_custom_template(template_id, file)

@app.get("/history")
async def get_history():
    return read_history()


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
