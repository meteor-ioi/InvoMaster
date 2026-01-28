import re
import numpy as np
import cv2
import os
from typing import List, Optional, Tuple, Any
from pydantic import BaseModel

# 假设我们在 main.py 所在的同级目录，或者可以从 main 导入模型
# 为了避免循环引用，我们在这里重新定义简化的解析器逻辑，或者接收字典
# 这里我们直接利用 main.py 中定义的模型（如果已经安装并可用）

def resolve_region_bounds(region: Any, pdf_page: Any, image_path: Optional[str] = None) -> Tuple[float, float, float, float]:
    """
    解析 Region 的实际物理坐标 (x, y, width, height)。
    支持从 PositioningConfig 动态计算。
    返回归一化坐标 (x, y, w, h)。
    """
    if not region.positioning or not region.positioning.enabled:
        return region.x, region.y, region.width, region.height
    
    cfg = region.positioning
    
    # 1. 确定锚点位置 (Anchor Point)
    anchor_x, anchor_y = resolve_anchor(cfg.anchor_locator, pdf_page, image_path, default=(region.x, region.y))
    
    # 2. 根据锚点位置推导起始点 (x, y)
    # 起始点通常指的是 top_left。如果锚点不是 top_left，需要反推。
    # 这里简单起见，我们默认锚点就是用户指定的那个角的坐标。
    
    # 3. 确定区域范围 (width, height)
    if cfg.boundary_mode == "adjacent":
        # 分别解析宽和高
        target_w = resolve_boundary(cfg.width_locator, pdf_page, image_path, anchor_val=anchor_x, is_horizontal=True, default_len=region.width)
        target_h = resolve_boundary(cfg.height_locator, pdf_page, image_path, anchor_val=anchor_y, is_horizontal=False, default_len=region.height)
    else:
        # 对角点模式
        diag_x, diag_y = resolve_anchor(cfg.diagonal_locator, pdf_page, image_path, default=(region.x + region.width, region.y + region.height))
        target_w = abs(diag_x - anchor_x)
        target_h = abs(diag_y - anchor_y)
        # 重新校正起点（如果对角点在锚点上方或左侧）
        anchor_x = min(anchor_x, diag_x)
        anchor_y = min(anchor_y, diag_y)

    return anchor_x, anchor_y, target_w, target_h

def resolve_anchor(locator: Any, pdf_page: Any, image_path: Optional[str], default: Tuple[float, float]) -> Tuple[float, float]:
    if not locator:
        return default
    
    if locator.method == "fixed":
        return locator.fixed_x if locator.fixed_x is not None else default[0], \
               locator.fixed_y if locator.fixed_y is not None else default[1]
    
    if locator.method == "relative":
        return locator.relative_x if locator.relative_x is not None else default[0], \
               locator.relative_y if locator.relative_y is not None else default[1]
    
    if locator.method == "text":
        return find_text_position(locator, pdf_page) or default
    
    if locator.method == "image" and image_path:
        return find_image_position(locator, image_path) or default
        
    return default

def resolve_boundary(locator: Any, pdf_page: Any, image_path: Optional[str], anchor_val: float, is_horizontal: bool, default_len: float) -> float:
    if not locator:
        return default_len
    
    if locator.method == "fixed":
        return locator.fixed_length if locator.fixed_length is not None else default_len
    
    if locator.method == "relative":
        return locator.relative_length if locator.relative_length is not None else default_len
    
    if locator.method == "text":
        pos = find_text_position(locator, pdf_page)
        if pos:
            target_val = pos[0] if is_horizontal else pos[1]
            return abs(target_val - anchor_val)
            
    if locator.method == "image" and image_path:
        pos = find_image_position(locator, image_path)
        if pos:
             target_val = pos[0] if is_horizontal else pos[1]
             return abs(target_val - anchor_val)

    return default_len

def find_text_position(locator: Any, pdf_page: Any) -> Optional[Tuple[float, float]]:
    """
    在页面中寻找文本位置，返回归一化坐标 (x, y)
    """
    if not locator.text_query:
        return None
    
    # 提取页面所有文本块及其坐标
    # pdf_page 是 pdfplumber 的 page 对象
    # 我们限制在 search_area 搜索
    search_bbox = None
    if locator.search_area:
        # [x, y, w, h] 归一化 -> [x0, y0, x1, y1] 物理坐标
        w, h = float(pdf_page.width), float(pdf_page.height)
        search_bbox = (
            locator.search_area[0] * w,
            locator.search_area[1] * h,
            (locator.search_area[0] + locator.search_area[2]) * w,
            (locator.search_area[1] + locator.search_area[3]) * h
        )
    
    target_page = pdf_page
    if search_bbox:
        try:
            target_page = pdf_page.crop(search_bbox)
        except Exception:
            pass # 裁剪失败则全页搜索
            
    words = target_page.extract_words()
    if not words:
        return None
    
    # Normalize query for robust matching: 
    # 1. Remove excess whitespace for comparison
    # 2. Convert to a pattern that allows flexible spacing (\s*) between characters if needed,
    #    but primarily focuses on sequence order.
    query_norm = re.sub(r'\s+', '', locator.text_query)
    
    # Simple strategy: Concatenate all words in the search area and find the query.
    # To handle spaces in original text, we match against both spaced and unspaced versions.
    full_text_spaced = " ".join([w['text'] for w in words])
    full_text_unspaced = "".join([w['text'] for w in words])
    
    match_start_idx = -1
    matched_len = 0
    
    if locator.is_regex:
        matches = list(re.finditer(locator.text_query, full_text_spaced))
        if len(matches) > locator.text_match_index:
            match = matches[locator.text_match_index]
            match_start_idx = match.start()
            matched_len = match.end() - match.start()
    else:
        # Whitespace-insensitive matching logic
        # We find the query in the unspaced text, then map back to words
        if query_norm in full_text_unspaced:
            # Find the match index-th occurrence
            occ_count = -1
            curr_pos = -1
            while occ_count < locator.text_match_index:
                curr_pos = full_text_unspaced.find(query_norm, curr_pos + 1)
                if curr_pos == -1: break
                occ_count += 1
            
            if curr_pos != -1:
                # Map curr_pos (unspaced) back to words array
                char_count = 0
                target_word_indices = []
                for i, w in enumerate(words):
                    w_text = w['text']
                    w_len = len(w_text)
                    # Does this word overlap with [curr_pos, curr_pos + len(query_norm)]?
                    w_start = char_count
                    w_end = char_count + w_len
                    
                    if not (w_end <= curr_pos or w_start >= curr_pos + len(query_norm)):
                        target_word_indices.append(i)
                    
                    char_count += w_len
                
                if target_word_indices:
                    # We use the first word of the match as the anchor point
                    target_word = words[target_word_indices[0]]
                    
                    # For multi-word anchors, 'center' or 'end' might need the whole span
                    last_word = words[target_word_indices[-1]]
                    
                    res_x = target_word['x0']
                    res_y = target_word['top']
                    
                    if hasattr(locator, 'text_position'):
                        if locator.text_position == "end":
                            res_x = last_word['x1']
                            res_y = last_word['bottom']
                        elif locator.text_position == "center":
                            res_x = (target_word['x0'] + last_word['x1']) / 2
                            res_y = (target_word['top'] + last_word['bottom']) / 2
                    
                    # Apply offsets and normalize
                    pw, ph = float(pdf_page.width), float(pdf_page.height)
                    res_x = (res_x / pw) + (getattr(locator, 'text_offset_x', 0))
                    res_y = (res_y / ph) + (getattr(locator, 'text_offset_y', 0))
                    return res_x, res_y

    return None

def find_image_position(locator: Any, image_path: str) -> Optional[Tuple[float, float]]:
    """
    使用 OpenCV 模板匹配寻找图像位置
    """
    if not locator.image_ref or not os.path.exists(image_path):
        return None
    
    # 获取参考图像（模板）
    # image_ref 可能是文件名，相对于 TEMPLATES_SOURCE_DIR 或 UPLOAD_DIR
    from main import UPLOAD_DIR, TEMPLATES_SOURCE_DIR
    template_path = os.path.join(UPLOAD_DIR, locator.image_ref)
    if not os.path.exists(template_path):
        template_path = os.path.join(TEMPLATES_SOURCE_DIR, locator.image_ref)
        
    if not os.path.exists(template_path):
        return None
        
    try:
        img_target = cv2.imread(image_path)
        img_template = cv2.imread(template_path)
        
        if img_target is None or img_template is None:
            return None
            
        # 如果提供了宽高比例，可以根据目标图大小缩放模板（可选，目前假设已经由前端处理好参考图尺寸）
        
        # 模板匹配
        res = cv2.matchTemplate(img_target, img_template, cv2.TM_CCOEFF_NORMED)
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(res)
        
        threshold = getattr(locator, 'match_threshold', 0.8)
        if max_val >= threshold:
            # max_loc 是 (x, y) 像素坐标
            h, w = img_target.shape[:2]
            # 返回模板中心点坐标还是左上角坐标？
            # 这里的 resolve_anchor 逻辑默认用户想要的是那个角的起始点
            # 模板通长是用户截取的一块典型特征图。
            return max_loc[0] / w, max_loc[1] / h
            
    except Exception:
        pass
        
    return None
