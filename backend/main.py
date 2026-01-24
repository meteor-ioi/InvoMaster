from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import os
import uvicorn
import shutil
import hashlib
import json
import time
import pdfplumber
from typing import List, Optional, Any

# Local imports
from utils import pdf_to_images
from inference import get_layout_engine
from database import db # SQLite integration
from fingerprint import engine as fp_engine # Enhanced Fingerprinting
from ocr_utils import get_ocr_chars_for_page, inject_ocr_chars_to_page, is_page_scanned
from task_worker import TaskWorker
import logging

# Configure Logging to share the same file as run_desktop.py
log_file = os.path.join(os.path.expanduser('~'), 'industry_pdf_debug.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("backend")
logger.info("Backend starting...")

app = FastAPI(title="HITL Document Extraction API")

# Storage paths configuration
base_data_dir = os.environ.get("APP_DATA_DIR", "data")
UPLOAD_DIR = os.path.join(base_data_dir, "uploads")
TEMPLATES_DIR = os.path.join(base_data_dir, "templates") # Root dir
TEMPLATES_AUTO_DIR = os.path.join(base_data_dir, "templates", "auto")
TEMPLATES_CUSTOM_DIR = os.path.join(base_data_dir, "templates", "custom")
TEMPLATES_SOURCE_DIR = os.path.join(base_data_dir, "template_sources")
OCR_CACHE_DIR = os.path.join(base_data_dir, "cache", "ocr")

for d in [UPLOAD_DIR, TEMPLATES_DIR, TEMPLATES_AUTO_DIR, TEMPLATES_CUSTOM_DIR, TEMPLATES_SOURCE_DIR, OCR_CACHE_DIR]:
    if not os.path.exists(d):
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
    text: Optional[str] = None # Deprecated: Use content instead
    content: Optional[Any] = None # Added: Cached extracted data (string or list)
    table_settings: Optional[dict] = None # For table-specific logic

class ExtractRequest(BaseModel):
    template_id: str
    file_name: Optional[str] = None # Used for logging

class HistoryItem(BaseModel):
    timestamp: str
    filename: str
    template_name: str
    result_summary: dict

class BatchDeleteRequest(BaseModel):
    indices: List[int]

class TaskBatchDeleteRequest(BaseModel):
    task_ids: List[str]

class Template(BaseModel):
    id: str
    mode: str = "auto" # 'auto' or 'custom'
    fingerprint: Optional[str] = None # Required for auto, optional for custom
    fingerprint_text: Optional[str] = None # Added: Cached text features
    name: str
    regions: List[Region]
    tags: List[str] = [] # Added for metadata
    filename: Optional[str] = None

HISTORY_FILE = os.path.join(base_data_dir, "history.jsonl")
API_TASKS_FILE = os.path.join(base_data_dir, "api_call_tasks.jsonl")
ERROR_LOG_FILE = os.path.join(base_data_dir, "error.log")

# ========== History Management Functions ==========
def append_history(item: dict):
    with open(HISTORY_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(item, ensure_ascii=False) + "\n")

def read_history(limit: int = 50):
    if not os.path.exists(HISTORY_FILE):
        return []
    lines = []
    with open(HISTORY_FILE, "r", encoding="utf-8") as f:
        lines = f.readlines()
    # Return last N lines reversed with index
    history_list = [json.loads(line) for line in reversed(lines[-limit:])]
    # Add index to each item for reference
    for idx, item in enumerate(history_list):
        item['index'] = idx
    return history_list

def delete_history_item(index: int):
    """Delete a history item by its index (0-based from most recent)"""
    return delete_history_batch([index]) > 0

def delete_history_batch(indices: List[int]):
    """Batch delete history items by their display indices"""
    if not os.path.exists(HISTORY_FILE):
        return 0
    
    with open(HISTORY_FILE, "r", encoding="utf-8") as f:
        lines = f.readlines()
    
    total = len(lines)
    # Convert display indices (0 is most recent) to actual file indices
    # actual_index = total - 1 - display_index
    actual_to_delete = {total - 1 - i for i in indices if 0 <= i < total}
    
    if not actual_to_delete:
        return 0
        
    new_lines = [line for idx, line in enumerate(lines) if idx not in actual_to_delete]
    
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        f.writelines(new_lines)
    
    return len(actual_to_delete)

def get_history_item(index: int):
    """Get a single history item by index"""
    history = read_history()
    if 0 <= index < len(history):
        return history[index]
    return None

# ========== API Task Management Functions ==========
def create_task(filename: str, template_id: str, template_name: str) -> str:
    """创建新任务，返回任务 ID"""
    import uuid
    import datetime
    
    task_id = f"task-{uuid.uuid4().hex[:12]}"
    task = {
        "id": task_id,
        "filename": filename,
        "template_id": template_id,
        "template_name": template_name,
        "status": "pending",
        "created_at": datetime.datetime.now().isoformat(),
        "started_at": None,
        "completed_at": None,
        "result": None,
        "error": None
    }
    append_task(task)
    return task_id

def append_task(task: dict):
    """追加任务到文件"""
    with open(API_TASKS_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(task, ensure_ascii=False) + "\n")

def read_all_tasks(limit: int = 100) -> List[dict]:
    """读取所有任务（最近 N 条，倒序）"""
    if not os.path.exists(API_TASKS_FILE):
        return []
    with open(API_TASKS_FILE, "r", encoding="utf-8") as f:
        lines = f.readlines()
    tasks = [json.loads(line.strip()) for line in reversed(lines[-limit:]) if line.strip()]
    # 添加索引方便前端使用
    for idx, task in enumerate(tasks):
        task['index'] = idx
    return tasks

def read_all_tasks_raw() -> List[dict]:
    """原始顺序读取所有任务（用于更新操作）"""
    if not os.path.exists(API_TASKS_FILE):
        return []
    with open(API_TASKS_FILE, "r", encoding="utf-8") as f:
        lines = f.readlines()
    return [json.loads(line.strip()) for line in lines if line.strip()]

def update_task_status(task_id: str, status: str, **kwargs) -> bool:
    """更新任务状态和其他字段"""
    import datetime
    
    tasks = read_all_tasks_raw()
    updated = False
    
    for task in tasks:
        if task['id'] == task_id:
            task['status'] = status
            if status == 'processing' and not task.get('started_at'):
                task['started_at'] = datetime.datetime.now().isoformat()
            elif status in ['completed', 'failed'] and not task.get('completed_at'):
                task['completed_at'] = datetime.datetime.now().isoformat()
            
            # 更新额外字段（如 result, error）
            task.update(kwargs)
            updated = True
            break
    
    if updated:
        with open(API_TASKS_FILE, "w", encoding="utf-8") as f:
            for task in tasks:
                f.write(json.dumps(task, ensure_ascii=False) + "\n")
    
    return updated

def get_task_by_id(task_id: str) -> Optional[dict]:
    """根据 ID 获取任务"""
    tasks = read_all_tasks_raw()
    for task in tasks:
        if task['id'] == task_id:
            return task
    return None

def delete_task_by_id(task_id: str) -> bool:
    """删除指定任务"""
    tasks = read_all_tasks_raw()
    original_count = len(tasks)
    tasks = [t for t in tasks if t['id'] != task_id]
    
    if len(tasks) < original_count:
        with open(API_TASKS_FILE, "w", encoding="utf-8") as f:
            for task in tasks:
                f.write(json.dumps(task, ensure_ascii=False) + "\n")
        return True
    return False

def delete_tasks_batch(task_ids: List[str]) -> int:
    """批量删除任务"""
    tasks = read_all_tasks_raw()
    original_count = len(tasks)
    task_ids_set = set(task_ids)
    tasks = [t for t in tasks if t['id'] not in task_ids_set]
    
    deleted_count = original_count - len(tasks)
    if deleted_count > 0:
        with open(API_TASKS_FILE, "w", encoding="utf-8") as f:
            for task in tasks:
                f.write(json.dumps(task, ensure_ascii=False) + "\n")
    
    return deleted_count

def get_history_item(index: int):
    """Get a single history item by index"""
    history = read_history()
    if 0 <= index < len(history):
        return history[index]
    return None

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

def extract_text_from_regions(pdf_path, regions: List[Region], image_path: Optional[str] = None, fingerprint: Optional[str] = None):
    """
    Uses pdfplumber to extract text from specific normalized coordinates.
    Supports high-precision table extraction if region type is 'table'.
    For scanned PDFs, automatically injects OCR results if no text is found.
    """
    logger.info(f"Extracting text from regions in {pdf_path}")
    results = []
    with pdfplumber.open(pdf_path) as pdf:
        first_page = pdf.pages[0]
        width, height = first_page.width, first_page.height
        page_bbox = first_page.bbox # (x0, top, x1, bottom)
        
        # Check if page is scanned (no text objects)
        is_scanned = is_page_scanned(first_page)
        if is_scanned:
            logger.info(f"Scanned PDF detected, attempting OCR injection...")
            if image_path and os.path.exists(image_path):
                try:
                    ocr_chars = get_ocr_chars_for_page(image_path, width, height, page_bbox, fingerprint=fingerprint, page_idx=1)
                    inject_ocr_chars_to_page(first_page, ocr_chars)
                    logger.info(f"OCR injection successful: {len(ocr_chars)} chars")
                except Exception as e:
                    logger.error(f"OCR injection failed: {e}")
            else:
                logger.warning(f"No image path provided for OCR, extraction may fail for scanned PDF")
        
        for reg in regions:
            # Convert normalized to physical coordinates (x1, y1, x2, y2)
            # Use page.bbox offset for robust mapping
            x0_off, y0_off = page_bbox[0], page_bbox[1]
            bbox = (
                x0_off + reg.x * width,
                y0_off + reg.y * height,
                x0_off + (reg.x + reg.width) * width,
                y0_off + (reg.y + reg.height) * height
            )
            
            # Skip zero-area regions to avoid pdfplumber ValueError
            if reg.width <= 0 or reg.height <= 0:
                print(f"Warning: Skipping zero-area region {reg.id} ({reg.type})")
                reg_dict = reg.dict()
                reg_dict["content"] = ""
                results.append(reg_dict)
                continue

            # Crop region
            try:
                cropped = first_page.crop(bbox)
            except Exception as e:
                print(f"Error cropping region {reg.id}: {e}")
                reg_dict = reg.dict()
                reg_dict["content"] = ""
                results.append(reg_dict)
                continue
            content = ""
            
            if reg.type.lower() == 'table':
                # Use saved table_settings or default
                s = reg.table_settings or {
                    "vertical_strategy": "text",
                    "horizontal_strategy": "text",
                    "snap_tolerance": 3,
                    "join_tolerance": 3,
                }
                
                # Convert explicit relative lines to absolute if present
                s_copy = s.copy()
                s_copy.pop('vertical_locked', None)
                s_copy.pop('horizontal_locked', None)

                if s_copy.get("vertical_strategy") == "explicit":
                    rel_cols = s_copy.get("explicit_vertical_lines", [])
                    s_copy["explicit_vertical_lines"] = [bbox[0] + (c * (bbox[2] - bbox[0])) for c in rel_cols]
                
                if s_copy.get("horizontal_strategy") == "explicit":
                    rel_rows = s_copy.get("explicit_horizontal_lines", [])
                    s_copy["explicit_horizontal_lines"] = [bbox[1] + (r * (bbox[3] - bbox[1])) for r in rel_rows]
                
                # Extract structured table as 2D array
                table_data = cropped.extract_table(s_copy)
                if table_data:
                    # Clean the data (remove None, strip)
                    content = [[str(c).strip() if c is not None else "" for c in row] for row in table_data]
                else:
                    content = cropped.extract_text() or ""
            else:
                text = cropped.extract_text()
                content = text.strip() if text else ""
            
            # --- Fallback: If content is still empty but we have an image, try a targeted OCR ---
            if not content and image_path and os.path.exists(image_path):
                logger.info(f"Region {reg.id} ({reg.type}) extraction is empty, falling back to direct OCR crop...")
                try:
                    from ocr_utils import run_ocr_on_image
                    from PIL import Image
                    
                    # 1. Load the page image
                    with Image.open(image_path) as img:
                        img_w, img_h = img.size
                        # 2. Map normalized coords to pixel coords
                        px_x0 = int(reg.x * img_w)
                        px_y0 = int(reg.y * img_h)
                        px_w = int(reg.width * img_w)
                        px_h = int(reg.height * img_h)
                        
                        # 3. Crop region from image
                        # Pillow crop bbox is (left, top, right, bottom)
                        bbox_crop = (
                            max(0, px_x0),
                            max(0, px_y0),
                            min(img_w, px_x0 + px_w),
                            min(img_h, px_y0 + px_h)
                        )
                        
                        if (bbox_crop[2] > bbox_crop[0]) and (bbox_crop[3] > bbox_crop[1]):
                            # 4. Save temp crop and run OCR
                            crop_img = img.crop(bbox_crop)
                            temp_crop_path = os.path.join(UPLOAD_DIR, f"temp_ocr_{reg.id}.png")
                            crop_img.save(temp_crop_path)
                            
                            ocr_results = run_ocr_on_image(temp_crop_path)
                            if ocr_results:
                                content = " ".join([res[1] for res in ocr_results])
                                logger.info(f"Fallback OCR success for {reg.id}: {content[:30]}...")
                            
                            if os.path.exists(temp_crop_path):
                                os.remove(temp_crop_path)
                except Exception as ex:
                    logger.error(f"Fallback OCR failed for region {reg.id}: {ex}")

            reg_dict = reg.dict()
            reg_dict["content"] = content # Use 'content' consistently
            # Ensure remarks are included
            results.append(reg_dict)
            
    return results

def sort_regions_spatially(regions):
    """
    Sort regions from top-left to bottom-right (reading order).
    Priority: Y coordinate (top to bottom), then X coordinate (left to right).
    Handles both Dict and Object (with attributes).
    """
    def get_sort_key(r):
        if isinstance(r, dict):
            return (r.get('y', 0), r.get('x', 0))
        else:
            # Handle Region objects or similar
            return (getattr(r, 'y', 0), getattr(r, 'x', 0))
    return sorted(regions, key=get_sort_key)

@app.get("/health")
async def root():
    return {"message": "HITL Document Extraction API is running"}

@app.post("/analyze")
def analyze_document(
    file: Optional[UploadFile] = File(None), 
    filename: Optional[str] = Form(None),
    device: Optional[str] = None, 
    conf: float = 0.25,
    imgsz: int = 1280,
    iou: float = 0.45,
    agnostic_nms: bool = False,
    refresh: bool = False,
    skip_history: bool = False  # 模板制作时跳过历史记录
):
    if device and device.lower() == "auto":
        device = None
    
    # Determine input file path
    if file:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        actual_filename = file.filename
    elif filename:
        actual_filename = filename
        # Check uploads
        file_path = os.path.join(UPLOAD_DIR, filename)
        if not os.path.exists(file_path):
            # Check template sources
            source_path = os.path.join(TEMPLATES_SOURCE_DIR, filename)
            if os.path.exists(source_path):
                file_path = source_path
            else:
                 # Try to assume filename might differ in source dir (search by ID?) 
                 # For now, simplistic check. If failed:
                 raise HTTPException(status_code=400, detail=f"File {filename} not found on server")
    else:
        raise HTTPException(status_code=400, detail="No file provided")
    
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
            # Match using engine (Threshold tuned for DocLayout-YOLO: 0.7)
            match_cand, score = fp_engine.find_best_match(file_path, candidates, threshold=0.7)
            
            if match_cand:
                print(f"Matched template {match_cand['id']} with score {score}")
                t_path = os.path.join(TEMPLATES_AUTO_DIR, f"{match_cand['id']}.json")
                if os.path.exists(t_path):
                     try:
                        with open(t_path, "r", encoding="utf-8") as f:
                            t_data = json.load(f)
                            # Ensure images are generated before extraction if needed for OCR
                            img_subdir = f"images_{fingerprint[:8]}"
                            img_save_path = os.path.join(UPLOAD_DIR, img_subdir)
                            image_paths = pdf_to_images(file_path, img_save_path)
                            
                            regions_objs = [Region(**r) for r in t_data.get("regions", [])]
                            matching_regions = extract_text_from_regions(file_path, regions_objs, image_path=image_paths[0] if image_paths else None, fingerprint=fingerprint)
                            template_found = True
                            matched_template_info = match_cand
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
    device_used = device or engine.device
    start_time = time.time()
    
    # MODIFIED: Skip AI inference if no template matched in auto mode (unless refreshing)
    if refresh or template_found:
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
            inference_time = time.time() - start_time
            # If refreshing (forcing AI), use AI results
            if refresh:
                matching_regions = ai_regions
                template_found = False # Reset flag for UI feedback
        except Exception as e:
            print(f"Inference error: {e}")
            if not template_found:
                matching_regions = []
            ai_regions = []
    else:
        # Auto mode failed to match, and we are not forcing refresh/AI
        # FIXED: If no template found and not refreshing, we SHOULD trigger AI inference
        # unless user explicitly wants to skip it. But here we usually want result.
        # However, to avoid redundancy, we check if we already have regions.
        if not matching_regions:
            print("No template matched, triggering AI layout inference...")
            try:
                ai_regions = engine.predict(
                    image_paths[0], 
                    device=device, 
                    conf=conf,
                    imgsz=imgsz,
                    iou=iou,
                    agnostic_nms=agnostic_nms
                )
                inference_time = time.time() - start_time
                matching_regions = ai_regions
            except Exception as e:
                print(f"Inference error during fallback: {e}")
                matching_regions = []
        else:
            print("Using matched template regions, skipping redundant AI inference.")
            inference_time = 0
            ai_regions = []

    
    # 5. 构建结果数据 (始终需要用于响应)
    # Sort matching_regions spatially before building the map
    matching_regions = sort_regions_spatially(matching_regions)
    result_map = {}
    for r in matching_regions:
        # Normalize region data (might be Region object or dict)
        r_dict = r if isinstance(r, dict) else (r.to_dict() if hasattr(r, 'to_dict') else vars(r))
        rid = r_dict.get('id', 'unknown')
        result_map[rid] = {
            "type": r_dict.get('type'),
            "label": r_dict.get('label') or rid,
            "remarks": r_dict.get('remarks') or '',
            "content": r_dict.get('content', r_dict.get('text', ''))
        }
    
    # 6. Log History (Auto Mode) - 仅在非模板制作测试时记录
    if not skip_history:
        template_name = matched_template_info.get("name") if matched_template_info else ("自动匹配" if template_found else "AI识别")
        
        import datetime
        append_history({
            "timestamp": datetime.datetime.now().isoformat(),
            "filename": actual_filename,
            "template_name": template_name,
            "mode": "auto",
            "result_summary": result_map
        })

    base_response = {
        "status": "success",
        "message": "success" if template_found else "未匹配到模板",  # ADDED: Explicit feedback message
        "id": fingerprint[:12],
        "fingerprint": fingerprint,
        "filename": actual_filename,
        "images": relative_images,
        "regions": matching_regions,
        "ai_regions": ai_regions if template_found else [], 
        "template_found": template_found,
        "matched_template": matched_template_info,
        "is_source": False,
        "data": result_map,
        "device_used": device_used,
        "inference_time": round(inference_time, 3) if 'inference_time' in locals() else 0
    }

    return base_response

@app.get("/templates/{template_id}/analyze")
def analyze_from_source(template_id: str):
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
        regions_data = t_data.get("regions", [])
        
        # Check if we have cached content for all regions
        has_all_content = all("content" in r and r["content"] is not None for r in regions_data)
        
        if has_all_content:
            print(f"Using cached content for template {template_id}")
            matching_regions = regions_data
        else:
            print(f"Missing cached content for template {template_id}, performing extraction...")
            regions_objs = [Region(**r) for r in regions_data]
            matching_regions = extract_text_from_regions(source_path, regions_objs, image_path=image_paths[0] if image_paths else None, fingerprint=fingerprint)
            
            # --- Persist the cache back to the JSON file ---
            try:
                # Convert back to dict for JSON serialization
                # Note: Region model includes 'content' now
                t_data["regions"] = matching_regions
                with open(t_path, "w", encoding="utf-8") as f:
                    json.dump(t_data, f, indent=2, ensure_ascii=False)
                print(f"Extraction result cached for template {template_id}")
            except Exception as e:
                print(f"Failed to cache template results: {e}")

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
def analyze_table_structure(req: TableAnalysisRequest):
    file_path = os.path.join(UPLOAD_DIR, req.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    try:
        with pdfplumber.open(file_path) as pdf:
            page = pdf.pages[0]
            
            # Check if page is scanned (no text objects) and inject OCR if needed
            if is_page_scanned(page):
                logger.info(f"Scanned PDF detected in /table/analyze, attempting OCR...")
                # Find corresponding image from fingerprint
                fingerprint = get_file_fingerprint(file_path)
                img_subdir = f"images_{fingerprint[:8]}"
                img_path = os.path.join(UPLOAD_DIR, img_subdir, "page_1.png")
                if os.path.exists(img_path):
                    try:
                        ocr_chars = get_ocr_chars_for_page(img_path, page.width, page.height, page.bbox, fingerprint=fingerprint, page_idx=1)
                        inject_ocr_chars_to_page(page, ocr_chars)
                        logger.info(f"OCR injection successful for table analysis")
                    except Exception as e:
                        logger.error(f"OCR injection failed in /table/analyze: {e}")
                else:
                    logger.warning(f"Image not found for OCR in /table/analyze: {img_path}")
            
            # Use original requested bbox with page offset to ensure stability
            # page.bbox is (x0, top, x1, bottom)
            x0_off, y0_off = page.bbox[0], page.bbox[1]
            orig_bbox = [
                x0_off + req.x * float(page.width),
                y0_off + req.y * float(page.height),
                x0_off + (req.x + req.width) * float(page.width),
                y0_off + (req.y + req.height) * float(page.height)
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
            
            # Remove frontend-only keys that might confuse pdfplumber
            s.pop('vertical_locked', None)
            s.pop('horizontal_locked', None)

            # Handle explicit lines conversion (Front-end sends 0-1 relative coords)
            # pdfplumber expects explicit lines in absolute page coordinates
            if s.get("vertical_strategy") == "explicit":
                # Convert relative X to absolute Page X
                rel_cols = s.get("explicit_vertical_lines", [])
                abs_cols = sorted(list(set([bbox[0] + (c * (bbox[2] - bbox[0])) for c in rel_cols])))
                
                # Safety: Ensure at least 2 lines (left and right edges) to prevent crash
                # pdfplumber requires at least 2 distinct values to form a valid explicit grid
                if len(abs_cols) < 2:
                    logger.warning(f"Explicit vertical lines insufficient ({len(abs_cols)}), injecting bbox edges.")
                    if not abs_cols or abs_cols[0] > bbox[0] + 0.1: abs_cols.insert(0, bbox[0])
                    if abs_cols[-1] < bbox[2] - 0.1: abs_cols.append(bbox[2])
                    
                s["explicit_vertical_lines"] = abs_cols
            
            if s.get("horizontal_strategy") == "explicit":
                # Convert relative Y to absolute Page Y
                rel_rows = s.get("explicit_horizontal_lines", [])
                abs_rows = sorted(list(set([bbox[1] + (r * (bbox[3] - bbox[1])) for r in rel_rows])))

                # Safety: Ensure at least 2 lines (top and bottom edges)
                if len(abs_rows) < 2:
                    logger.warning(f"Explicit horizontal lines insufficient ({len(abs_rows)}), injecting bbox edges.")
                    if not abs_rows or abs_rows[0] > bbox[1] + 0.1: abs_rows.insert(0, bbox[1])
                    if abs_rows[-1] < bbox[3] - 0.1: abs_rows.append(bbox[3])

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
                    "x": (orig_bbox[0] - x0_off) / float(page.width),
                    "y": (orig_bbox[1] - y0_off) / float(page.height),
                    "width": (orig_bbox[2] - orig_bbox[0]) / float(page.width),
                    "height": (orig_bbox[3] - orig_bbox[1]) / float(page.height)
                }
            }
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        print(error_msg)
        with open(ERROR_LOG_FILE, "a") as f:
            f.write(f"--- Error in /table/analyze ---\n{error_msg}\n")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/regions/extract")
def extract_multiple_regions(
    filename: str = Form(...),
    regions: str = Form(...) # JSON string of regions
):
    """
    Extract data from multiple regions for previewing.
    """
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
         # Also check source lib
         source_path = os.path.join(TEMPLATES_SOURCE_DIR, filename)
         if os.path.exists(source_path):
             file_path = source_path
         else:
             raise HTTPException(status_code=404, detail=f"File {filename} not found")
    
    try:
        regions_list = json.loads(regions)
        region_objs = [Region(**r) for r in regions_list]
        
        # Get fingerprint to locate images if needed for OCR
        fingerprint = get_file_fingerprint(file_path)
        img_subdir = f"images_{fingerprint[:8]}"
        img_path = os.path.join(UPLOAD_DIR, img_subdir, "page_1.png")
        
        results = extract_text_from_regions(
            file_path, 
            region_objs, 
            image_path=img_path if os.path.exists(img_path) else None,
            fingerprint=fingerprint
        )
        return results
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/templates")
async def list_templates(mode: Optional[str] = None, tag: Optional[str] = None):
    return db.list_templates(mode=mode, tag=tag)

@app.post("/templates")
def save_template(template: Template):
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

@app.delete("/templates/{template_id}")
async def delete_template(template_id: str):
    # 1. Get info from DB
    t_record = db.get_template(template_id)
    if not t_record:
        # Check if it exists in base dir if not in DB
        t_path = os.path.join(TEMPLATES_DIR, f"{template_id}.json")
        if not os.path.exists(t_path):
            raise HTTPException(status_code=404, detail="Template not found")
        filename_to_delete = t_path
    else:
        filename_to_delete = t_record.get('filename')

    # 2. Delete from DB
    db.delete_template(template_id)

    # 3. Delete physical files
    # Delete JSON
    if filename_to_delete and os.path.exists(filename_to_delete):
        os.remove(filename_to_delete)
    
    # Delete fallback JSONs
    for d in [TEMPLATES_AUTO_DIR, TEMPLATES_CUSTOM_DIR, TEMPLATES_DIR]:
        p = os.path.join(d, f"{template_id}.json")
        if os.path.exists(p):
            os.remove(p)

    # Delete Source PDF
    source_pdf = os.path.join(TEMPLATES_SOURCE_DIR, f"{template_id}.pdf")
    if os.path.exists(source_pdf):
        os.remove(source_pdf)

    return {"status": "success", "message": f"Template {template_id} deleted"}

@app.post("/templates/migrate")
def migrate_templates_fingerprints():
    """
    Utility to upgrade all existing templates to v2_visual fingerprints.
    It uses the preserved source PDFs in data/template_sources.
    """
    templates = db.list_templates()
    migrated_count = 0
    errors = []
    
    for t in templates:
        t_id = t['id']
        source_pdf = os.path.join(TEMPLATES_SOURCE_DIR, f"{t_id}.pdf")
        
        if os.path.exists(source_pdf):
            try:
                # 重新提取视觉特征
                new_features = fp_engine.extract_features(source_pdf)
                features_json = json.dumps(new_features)
                
                # 更新数据库
                db.save_template(
                    t_id=t_id,
                    mode=t['mode'],
                    name=t['name'],
                    filename=t['filename'],
                    fingerprint=t['fingerprint'],
                    fingerprint_text=features_json,
                    tags=t['tags']
                )
                
                # 同步更新 JSON 文件内容 (可选但推荐保持一致)
                if t['filename'] and os.path.exists(t['filename']):
                    with open(t['filename'], "r", encoding="utf-8") as f:
                        data = json.load(f)
                    data['fingerprint_text'] = features_json
                    with open(t['filename'], "w", encoding="utf-8") as f:
                        json.dump(data, f, indent=2, ensure_ascii=False)
                        
                migrated_count += 1
            except Exception as e:
                errors.append({"id": t_id, "error": str(e)})
        else:
            errors.append({"id": t_id, "error": "Source PDF not found in repository"})
            
    return {
        "status": "success" if not errors else "partial",
        "migrated": migrated_count,
        "errors": errors
    }


@app.post("/extract/{template_id}")
def extract_with_custom_template(
    template_id: str,
    file: UploadFile = File(...),
    device: Optional[str] = None
):
    """
    CUSTOM MODE: Explicitly apply a template to an uploaded file, ignoring fingerprint.
    IF template_id is 'auto', it performs automatic matching (similar to /analyze).
    Also records the task to API Task Queue for persistence.
    """
    # 0. Pre-resolve template name for Task creation
    template_name = "自动识别"
    if template_id.lower() != "auto":
        t_record = db.get_template(template_id)
        if t_record:
            template_name = t_record['name']
        else:
            template_name = "Unknown"

    # 1. Create Task (Pending -> Processing)
    task_id = create_task(file.filename, template_id, template_name)
    update_task_status(task_id, 'processing')

    try:
        if device and device.lower() == "auto":
            device = None

        # --- Branch A: Auto Mode ---
        if template_id.lower() == "auto":
            result = analyze_document(file=file, device=device)
            
            # Determine template name for record
            if result.get("template_found") and result.get("matched_template"):
                template_name_str = result["matched_template"]["name"]
            else:
                template_name_str = "未匹配到模板"

            # Update Task
            task_result_data = {
                "filename": result.get("filename"),
                "template_name": template_name_str,
                "mode": result.get("mode", "auto"),
                "data": result.get("data", {}),
                "message": result.get("message")
            }
            update_task_status(task_id, 'completed', result=task_result_data)
            return result

        # --- Branch B: Custom Mode ---
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
            
        # 2. Save Uploaded File
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 3. Extract
        fingerprint = get_file_fingerprint(file_path)
        img_subdir = f"images_{fingerprint[:8]}"
        img_save_path = os.path.join(UPLOAD_DIR, img_subdir)
        image_paths = pdf_to_images(file_path, img_save_path)
        
        regions_objs = [Region(**r) for r in t_data.get("regions", [])]
        extracted_regions = extract_text_from_regions(file_path, regions_objs, image_path=image_paths[0] if image_paths else None, fingerprint=fingerprint)
        
        # 4. Format Output
        # Sort extracted_regions spatially
        extracted_regions = sort_regions_spatially(extracted_regions)
        
        result_map = {}
        for r in extracted_regions:
            key = r.get("id")
            meta = {k: v for k, v in r.items() if k not in ["x", "y", "width", "height", "content", "text", "id", "table_settings"]}
            result_map[key] = {
                "content": r.get("content", ""),
                **meta
            }
            
        # 5. Log to OLD History (keep for compatibility)
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
            
        base_response = {
            "status": "success",
            "filename": file.filename,
            "template_name": t_data.get("name"),
            "mode": t_record['mode'],
            "data": result_map,
            "raw_regions": extracted_regions
        }

        # 6. Update Task Status
        task_result_data = {
            "filename": file.filename,
            "template_name": t_data.get("name"),
            "mode": t_record['mode'],
            "data": result_map
        }
        update_task_status(task_id, 'completed', result=task_result_data)

        return base_response
        
    except Exception as e:
        print(f"Extraction error: {e}")
        import traceback
        traceback.print_exc()
        update_task_status(task_id, 'failed', error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/extract")
def extract_from_template_legacy(
    template_id: str,
    file: UploadFile = File(...),
    device: Optional[str] = None
):
    # Deprecated or strictly Auto-mode compatible
    # Forward to new handler for now
    return extract_with_custom_template(template_id, file, device=device)

@app.get("/history")
async def get_history():
    return read_history()

@app.get("/history/{index}")
async def get_history_detail(index: int):
    """Get detailed information for a specific history item"""
    item = get_history_item(index)
    if not item:
        raise HTTPException(status_code=404, detail="History item not found")
    return item

@app.delete("/history/{index}")
async def delete_history(index: int):
    """Delete a history item by index"""
    success = delete_history_item(index)
    if not success:
        raise HTTPException(status_code=404, detail="History item not found")
    return {"status": "success", "message": f"History item {index} deleted"}

@app.post("/history/batch-delete")
async def batch_delete_history(req: BatchDeleteRequest):
    """Batch delete history items by their display indices"""
    deleted_count = delete_history_batch(req.indices)
    return {"status": "success", "deleted": deleted_count}

# ========== API Task Management Endpoints ==========

@app.post("/api/tasks")
def create_extraction_task(
    file: UploadFile = File(...),
    template_id: str = Form("auto")
):
    """创建新的提取任务，返回任务 ID"""
    # 保存上传的文件
    filename = file.filename
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    
    # 获取模板名称
    if template_id.lower() == 'auto':
        template_name = "自动识别"
    else:
        t_record = db.get_template(template_id)
        template_name = t_record['name'] if t_record else "Unknown"
    
    # 创建任务
    task_id = create_task(
        filename=filename,
        template_id=template_id,
        template_name=template_name
    )
    
    return {
        "task_id": task_id,
        "status": "pending",
        "message": "Task created successfully"
    }

@app.get("/api/tasks")
async def list_all_tasks(limit: int = 100):
    """获取所有任务列表"""
    tasks = read_all_tasks(limit=limit)
    return tasks

@app.get("/api/tasks/{task_id}")
async def get_task_detail(task_id: str):
    """查询单个任务的详细信息"""
    task = get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@app.delete("/api/tasks/{task_id}")
async def delete_single_task(task_id: str):
    """删除单个任务"""
    success = delete_task_by_id(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"status": "success", "message": f"Task {task_id} deleted"}

@app.post("/api/tasks/batch-delete")
async def batch_delete_tasks(req: TaskBatchDeleteRequest):
    """批量删除任务"""
    deleted_count = delete_tasks_batch(req.task_ids)
    return {"status": "success", "deleted": deleted_count}

# ========== System Management Endpoints ==========

MODELS_CONFIG = {
    "yolo": {
        "name": "Layout Analysis (YOLOv10)",
        "file": "yolov10-doclayout.onnx", # This matches config["filename"] in get_model_status
        "repo": "wybxc/DocLayout-YOLO-DocStructBench-onnx",
        "filename": "doclayout_yolo_docstructbench_imgsz1024.onnx",
        "size": "77MB",
        "expected_size": 80742400, # Approx size in bytes
        "description": "用于自动识别页面布局和表格区域"
    },
    "ocr_det": {
        "name": "OCR Detection",
        "file": "ch_PP-OCRv4_det_infer.onnx", # Flat name for local check
        "repo": "SWHL/RapidOCR",
        "filename": "PP-OCRv4/ch_PP-OCRv4_det_infer.onnx", # Subpath for HF download
        "size": "4.7MB",
        "expected_size": 4894371, 
        "description": "用于检测文字所在位置"
    },
    "ocr_rec": {
        "name": "OCR Recognition",
        "file": "ch_PP-OCRv4_rec_infer.onnx",
        "repo": "SWHL/RapidOCR",
        "filename": "PP-OCRv4/ch_PP-OCRv4_rec_infer.onnx", # Subpath in repo
        "size": "11MB",
        "expected_size": 10905190,
        "description": "用于将图片文字转为文本内容"
    }
}

# Real-time download progress store
DOWNLOAD_PROGRESS = {}

def get_model_status():
    status = []
    user_models_dir = os.path.join(base_data_dir, "models")
    
    # Multiple search paths for models
    search_paths = [user_models_dir]
    
    if getattr(sys, 'frozen', False):
        # Packaged app: check bundled models
        search_paths.append(os.path.join(sys._MEIPASS, "models"))
    else:
        # Dev mode: check various locations
        script_dir = os.path.dirname(os.path.abspath(__file__))
        search_paths.append(os.path.join(script_dir, "models"))
        search_paths.append(os.path.join(script_dir, "data", "models"))
        # Also check relative to CWD (how inference.py works in dev mode)
        search_paths.append(os.path.join("data", "models"))
        search_paths.append("models")
    
    for mid, config in MODELS_CONFIG.items():
        m_path = None
        exists = False
        
        # Build candidate paths from all search locations
        candidates = []
        for sp in search_paths:
            candidates.append(os.path.join(sp, config["file"]))
            candidates.append(os.path.join(sp, os.path.basename(config["file"])))
            if "ocr" in mid:
                candidates.append(os.path.join(sp, "ocr", os.path.basename(config["file"])))
        
        for c in candidates:
            if os.path.exists(c):
                m_path = c
                exists = True
                break
        
        if not m_path:
            m_path = config["file"] # Fallback for display
        
        size = os.path.getsize(m_path) if exists else 0
        
        status.append({
            "id": mid,
            "name": config["name"],
            "exists": exists,
            "size": f"{size / (1024*1024):.1f}MB" if exists else config["size"],
            "path": m_path if exists else config["file"],
            "description": config["description"],
            "downloading": mid in DOWNLOAD_PROGRESS and DOWNLOAD_PROGRESS[mid] < 100
        })
    return status

@app.get("/system/status")
async def get_system_status():
    return {
        "models": get_model_status(),
        "app_data_dir": base_data_dir,
        "platform": sys.platform,
        "version": "1.1.0"
    }

@app.get("/system/models/progress")
async def get_download_progress():
    return DOWNLOAD_PROGRESS

@app.post("/system/models/download")
async def download_model(model_id: str):
    if model_id not in MODELS_CONFIG:
        raise HTTPException(status_code=400, detail="Invalid model ID")
    
    config = MODELS_CONFIG[model_id]
    DOWNLOAD_PROGRESS[model_id] = 0
    
    def perform_download():
        from huggingface_hub import hf_hub_download
        import os
        
        os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"
        models_dir = os.path.join(base_data_dir, "models")
        os.makedirs(models_dir, exist_ok=True)
        
        try:
            DOWNLOAD_PROGRESS[model_id] = 5
            
            # Start observer thread to monitor file size
            dest_path = os.path.join(models_dir, config["filename"]) # Use HF subpath as download target
            
            def monitor_size():
                expected = config.get("expected_size", 100)
                while model_id in DOWNLOAD_PROGRESS and DOWNLOAD_PROGRESS[model_id] < 100:
                    if os.path.exists(dest_path):
                        current = os.path.getsize(dest_path)
                        DOWNLOAD_PROGRESS[model_id] = min(99, int((current / expected) * 100))
                    time.sleep(1)
            
            threading.Thread(target=monitor_size, daemon=True).start()
            
            hf_hub_download(
                repo_id=config["repo"],
                filename=config["filename"],
                local_dir=models_dir,
                local_dir_use_symlinks=False
            )
            
            DOWNLOAD_PROGRESS[model_id] = 100
            print(f"Successfully downloaded {model_id}")
        except Exception as e:
            DOWNLOAD_PROGRESS[model_id] = -1 
            print(f"Failed to download {model_id}: {e}")

    import threading
    threading.Thread(target=perform_download, daemon=True).start()
    
    return {"status": "success", "message": f"Download started for {model_id}"}

# ========== Data Backup & Restore ==========
from fastapi.responses import FileResponse
import tempfile
import zipfile

@app.get("/system/data/export")
async def export_data():
    """将核心数据打包并导出为 ZIP"""
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    export_filename = f"InvoMaster_Backup_{timestamp}"
    
    # 创建临时 Zip 文件
    with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp:
        tmp_path = tmp.name
        
    try:
        with zipfile.ZipFile(tmp_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # 遍历数据目录
            for root, dirs, files in os.walk(base_data_dir):
                # 排除不需要备份的服务配置、模型目录 (体积大) 和 缓存目录
                if 'models' in root or 'cache' in root or 'runs' in root:
                    continue
                
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, base_data_dir)
                    zipf.write(file_path, arcname)
                    
        return FileResponse(
            tmp_path, 
            filename=f"{export_filename}.zip",
            background=None # 客户端下载完成后再删除物理文件由 FileResponse 自动处理不一定可靠，这里简单返回
        )
    except Exception as e:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@app.post("/system/data/import")
async def import_data(file: UploadFile = File(...)):
    """从 ZIP 包恢复数据"""
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only ZIP files are supported")
        
    # 保存上传的包
    with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name
        
    try:
        # 验证 ZIP 包结构
        with zipfile.ZipFile(tmp_path, 'r') as zipf:
            file_list = zipf.namelist()
            # 必须包含核心数据库文件
            if "metadata.db" not in file_list:
                raise HTTPException(status_code=400, detail="Invalid backup file: metadata.db missing")
            
            # 1. 备份当前数据到 data_old 目录
            old_backup = base_data_dir + "_old_before_import"
            if os.path.exists(old_backup):
                shutil.rmtree(old_backup)
            
            # 这里我们只克隆关键文件夹（排除 models 等大的内容）
            shutil.copytree(base_data_dir, old_backup, ignore=shutil.ignore_patterns('models', 'cache', 'runs'))
            
            # 2. 执行解压覆盖
            zipf.extractall(base_data_dir)
            
        return {"status": "success", "message": "Data restored successfully. Please restart the application."}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

@app.post("/system/models/import")
async def import_model(model_id: str, file: UploadFile = File(...)):
    if model_id not in MODELS_CONFIG:
        raise HTTPException(status_code=400, detail="Invalid model ID")
        
    config = MODELS_CONFIG[model_id]
    models_dir = os.path.join(base_data_dir, "models")
    dest_path = os.path.join(models_dir, config["file"])
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"status": "success", "message": f"Model {model_id} imported successfully"}

# ========== Application Lifecycle ==========
import sys

# 初始化任务处理器
task_worker = TaskWorker(sys.modules[__name__])

@app.on_event("startup")
async def startup_event():
    """应用启动时执行"""
    print("=== Starting Application ===")
    task_worker.start()

@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时执行"""
    print("=== Shutting Down Application ===")
    task_worker.stop()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8291)
