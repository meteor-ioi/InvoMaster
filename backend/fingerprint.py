import hashlib
import pdfplumber
import os
import re
import json
import numpy as np
import fitz  # PyMuPDF
from PIL import Image
from typing import List, Dict, Optional, Tuple
from difflib import SequenceMatcher
from inference import get_layout_engine

class FingerprintEngine:
    def __init__(self):
        # 复用项目中已有的 LayoutEngine
        pass

    def get_md5(self, file_path: str) -> str:
        hasher = hashlib.md5()
        with open(file_path, 'rb') as f:
            buf = f.read()
            hasher.update(buf)
        return hasher.hexdigest()

    def extract_features(self, file_path: str) -> Dict:
        """
        Extracts visual layout features using DocLayout-YOLO.
        Features include: box categories and their relative positions.
        """
        features = {
            "version": "v2_visual",
            "md5": self.get_md5(file_path),
            "aspect_ratio": 0.0,
            "layout_boxes": [] # List of [class_id, x_center, y_center, width, height]
        }
        
        try:
            # 1. 基础宽高比 (使用 pdfplumber 快速获取)
            with pdfplumber.open(file_path) as pdf:
                if len(pdf.pages) > 0:
                    page = pdf.pages[0]
                    features["aspect_ratio"] = round(float(page.width) / float(page.height), 3)
            
            # 2. 视觉布局提取 (复用 singleton 引擎)
            engine_instance = get_layout_engine()
            
            # 将 PDF 第一页转为图像进行推理
            from utils import pdf_to_images
            import tempfile
            
            # 使用临时目录生成图像
            with tempfile.TemporaryDirectory() as temp_dir:
                image_paths = pdf_to_images(file_path, temp_dir, dpi=200)
                
                if image_paths and len(image_paths) > 0:
                    # 只处理第一页
                    first_page_img = image_paths[0]
                    
                    # === OPTIMIZATION: Fingerprint sequence depends on layout blocks, not fine pixels ===
                    # Use fast_mode=True to skip expensive image enhancement filters
                    regions = engine_instance.predict(first_page_img, conf=0.1, imgsz=1024, fast_mode=True)
                    
                    layout_data = []
                    # 遍历识别出的区块
                    for region in regions:
                        # 提取归一化坐标
                        x_center = region['x'] + region['width'] / 2
                        y_center = region['y'] + region['height'] / 2
                        
                        # 尝试从 label 反向查找 class_id
                        label = region['label']
                        cls_id = 0
                        for cid, cname in [(0, 'title'), (1, 'plain text'), (2, 'abandon'), 
                                          (3, 'figure'), (4, 'figure_caption'), (5, 'table'), 
                                          (6, 'table_caption'), (7, 'table_footnote'), 
                                          (8, 'isolate_formula'), (9, 'formula_caption')]:
                            if cname.lower() == label.lower():
                                cls_id = cid
                                break
                        
                        # [类别, x_center, y_center, width, height]
                        layout_data.append([
                            cls_id,
                            round(x_center, 4),
                            round(y_center, 4),
                            round(region['width'], 4),
                            round(region['height'], 4)
                        ])
                    
                    # Apply Smart Deduplication (Moderate Mode)
                    layout_data = self.merge_overlapping_regions(layout_data, mode='moderate')
                    
                    # 按 Y 轴中心点排序，确保指纹序列的一致性
                    layout_data.sort(key=lambda x: x[2])
                    features["layout_boxes"] = layout_data
                    
        except Exception as e:
            print(f"Error extracting visual features: {e}")
            
        return features

    def merge_overlapping_regions(self, regions: List[List], mode: str = 'moderate') -> List[List]:
        """
        Smart Deduplication: Merge overlapping regions of the same class.
        Logic ported from frontend TemplateCreator.jsx.
        """
        if mode == 'off' or not regions:
            return regions
            
        # IoU Threshold: moderate=0.5, aggressive=0.3
        iou_threshold = 0.3 if mode == 'aggressive' else 0.5
        
        # Region format: [cls_id, x_center, y_center, width, height]
        # Convert to: [cls_id, x, y, width, height] for easier calc
        # Actually we need x, y (top-left) to calc intersection
        
        def get_rect(r):
            w = r[3]
            h = r[4]
            x = r[1] - w / 2
            y = r[2] - h / 2
            return {'x': x, 'y': y, 'w': w, 'h': h, 'cls': r[0]}
            
        rects = [get_rect(r) for r in regions]
        
        merged_indices = set()
        final_rects = []
        
        for i in range(len(rects)):
            if i in merged_indices:
                continue
                
            current = rects[i].copy()
            merged_indices.add(i)
            
            for j in range(i + 1, len(rects)):
                if j in merged_indices:
                    continue
                    
                other = rects[j]
                
                # Only merge same type
                if current['cls'] != other['cls']:
                    continue
                    
                # Calculate IoU
                x1 = max(current['x'], other['x'])
                y1 = max(current['y'], other['y'])
                x2 = min(current['x'] + current['w'], other['x'] + other['w'])
                y2 = min(current['y'] + current['h'], other['y'] + other['h'])
                
                if x2 <= x1 or y2 <= y1:
                    intersection = 0
                else:
                    intersection = (x2 - x1) * (y2 - y1)
                    
                areaA = current['w'] * current['h']
                areaB = other['w'] * other['h']
                union = areaA + areaB - intersection
                
                if union <= 0: iou = 0
                else: iou = intersection / union
                
                if iou >= iou_threshold:
                    # Merge: take bounding box of both
                    new_x = min(current['x'], other['x'])
                    new_y = min(current['y'], other['y'])
                    new_x2 = max(current['x'] + current['w'], other['x'] + other['w'])
                    new_y2 = max(current['y'] + current['h'], other['y'] + other['h'])
                    
                    current['x'] = new_x
                    current['y'] = new_y
                    current['w'] = new_x2 - new_x
                    current['h'] = new_y2 - new_y
                    
                    merged_indices.add(j)
            
            final_rects.append(current)

        # Convert back to center format [cls_id, x_center, y_center, width, height]
        result = []
        for r in final_rects:
            result.append([
                r['cls'],
                round(r['x'] + r['w'] / 2, 4),
                round(r['y'] + r['h'] / 2, 4),
                round(r['w'], 4),
                round(r['h'], 4)
            ])
            
        print(f"Smart Deduplication ({mode}): {len(regions)} -> {len(result)} regions")
        return result

    def _get_layout_signature(self, boxes: List[List]) -> str:
        # Group similar classes to improve robustness:
        # Text Group: title(0), plain text(1) -> T
        # Structure Group: figure(3), table(5) -> S
        # Caption Group: figure_caption(4), table_caption(6), table_footnote(7) -> C
        # Formula Group: isolate_formula(8), formula_caption(9) -> F
        # Ignore: abandon(2)
        
        group_map = {
            0: 'T', 1: 'T',
            3: 'S', 5: 'S',
            4: 'C', 6: 'C', 7: 'C',
            8: 'F', 9: 'F'
        }
        
        sig_chars = []
        last_char = None
        
        for b in boxes:
            cls_id = b[0]
            # Filter noise: boxes smaller than 0.2% of page area are likely OCR artifacts or lines
            area = b[3] * b[4]
            if area < 0.002:
                continue
                
            if cls_id in group_map:
                char = group_map[cls_id]
                # Collapse consecutive duplicates
                if char != last_char:
                    sig_chars.append(char)
                    last_char = char
                
        return "".join(sig_chars)

    def is_subsequence(self, s1: str, s2: str) -> bool:
        """Check if s1 is a subsequence of s2"""
        it = iter(s2)
        return all(c in it for c in s1)

    def calculate_spatial_similarity(self, t_boxes: List[List], c_boxes: List[List], matcher: SequenceMatcher) -> float:
        """
        Calculates spatial similarity based on matched blocks.
        Only considers Y-coordinates (vertical layout) and Height.
        """
        matches = matcher.get_matching_blocks()
        total_weight = 0.0
        total_score = 0.0
        
        # Filter source boxes to match the signature construction logic (remove small boxes, etc)
        # Note: self._get_layout_signature filters boxes < 0.2% area. 
        # We need to apply the same filtering to get correct indices, OR rely on the fact that
        # the signature was built from these boxes.
        # Actually, _get_layout_signature returns a string, but doesn't return the indices of original boxes used.
        # This is a bit tricky. The signature indices correspond to the FILTERED and COLLAPSED boxes.
        # To do this correctly without refactoring _get_layout_signature to return mapping, 
        # we have to re-simulate the filtering and collapsing.
        
        # Let's simplify: 
        # 1. Get filtered lists first
        t_filtered = [b for b in t_boxes if (b[3] * b[4]) >= 0.002 and b[0] in [0,1,3,4,5,6,7,8,9]]
        c_filtered = [b for b in c_boxes if (b[3] * b[4]) >= 0.002 and b[0] in [0,1,3,4,5,6,7,8,9]]
        
        # 2. Get collapsed lists (keeping track of original boxes is hard with simple collapse)
        # For now, let's assume specific "Key Elements" like Tables/Figures are not collapsed often 
        # or are the most important ones.
        # Alternative: Don't use the collapsed signature indices for spatial extraction directly 
        # if we can't map them back.
        
        # STRATEGY: 
        # Instead of complex mapping, let's compare the raw filtered lists using the same SequenceMatcher
        # taking just the class ID for matching, then checking spatial for matches.
        
        group_map = {
            0: 'T', 1: 'T',
            3: 'S', 5: 'S',
            4: 'C', 6: 'C', 7: 'C',
            8: 'F', 9: 'F'
        }
        
        t_seq = [group_map.get(b[0], 'X') for b in t_filtered]
        c_seq = [group_map.get(b[0], 'X') for b in c_filtered]
        
        # Re-run matcher on uncollapsed sequence for spatial alignment
        spatial_matcher = SequenceMatcher(None, t_seq, c_seq)
        
        for match in spatial_matcher.get_matching_blocks():
            i, j, n = match
            if n == 0: continue
            
            for k in range(n):
                tb = t_filtered[i+k]
                cb = c_filtered[j+k]
                
                # Compare Y Center (Vertical Position) - Important
                # Tolerance: 0.05 (5% of page height)
                dy = abs(tb[2] - cb[2])
                y_score = max(0, 1.0 - dy / 0.1) # Linear drop off, 0 at 10% diff
                
                # Compare Height - Less important but useful
                dh = abs(tb[4] - cb[4])
                h_score = max(0, 1.0 - dh / 0.2) # Linear drop off, 0 at 20% diff
                
                # Compare Width - Optional (cols might change)
                dw = abs(tb[3] - cb[3])
                w_score = max(0, 1.0 - dw / 0.2)
                
                # Weighted Item Score
                item_score = 0.6 * y_score + 0.2 * h_score + 0.2 * w_score
                
                # Weight by area (larger elements matter more)
                weight = max(tb[3]*tb[4], 0.01)
                
                total_score += item_score * weight
                total_weight += weight
                
        if total_weight == 0:
            return 0.0
            
        return total_score / total_weight

    def calculate_score(self, target: Dict, candidate_features: Dict) -> float:
        """
        Calculates similarity using visual layout alignment.
        1. Aspect Ratio (Hard gate) - Relaxed to 0.05
        2. Layout Category Sequence (60%)
        3. Spatial Position Correlation (40%)
        """
        # 0. Check version
        if candidate_features.get("version") != "v2_visual":
            return 0.0

        # 1. Aspect Ratio
        t_ar = target.get("aspect_ratio", 0)
        c_ar = candidate_features.get("aspect_ratio", 0)
        if abs(t_ar - c_ar) > 0.05:
            return 0.0
            
        t_boxes = target.get("layout_boxes", [])
        c_boxes = candidate_features.get("layout_boxes", [])
        
        if not t_boxes or not c_boxes:
            return 0.0
            
        # 2. Sequence Similarity
        t_sig = self._get_layout_signature(t_boxes)
        c_sig = self._get_layout_signature(c_boxes)
        
        matcher = SequenceMatcher(None, t_sig, c_sig)
        seq_sim = matcher.ratio()
        
        # 3. Subsequence Boost (with limits)
        if seq_sim < 0.85:
            len_t = len(t_sig)
            len_c = len(c_sig)
            if len_t > 0 and len_c > 0:
                min_len = min(len_t, len_c)
                max_len = max(len_t, len_c)
                
                # Only check subsequence if length ratio is reasonable (> 30%)
                # to avoid matching "T" with "TVTVTVTV"
                if min_len / max_len > 0.3:
                    is_sub = False
                    if len_t < len_c:
                        is_sub = self.is_subsequence(t_sig, c_sig)
                    else:
                        is_sub = self.is_subsequence(c_sig, t_sig)
                    
                    if is_sub:
                        # Boost, but cap based on length diff
                        # If I am 30% of you, I can only get max 0.7 score (example)
                        # Let's simple boost: average of original and 1.0, scaled by length ratio
                        boost_factor = min_len / max_len
                        seq_sim = max(seq_sim, 0.6 + 0.3 * boost_factor)

        # 4. Spatial Similarity
        # If sequence is completely off, spatial doesn't matter much.
        # But if sequence is good, spatial discriminates same-structure different-layout.
        spatial_sim = 0.0
        if seq_sim > 0.3: # Only calculate if there's some structural resemblance
            spatial_sim = self.calculate_spatial_similarity(t_boxes, c_boxes, matcher)
        
        # Final Score Mix
        # Sequence is foundation (0.6), Spatial is refinement (0.4)
        final_score = seq_sim * 0.6 + spatial_sim * 0.4
        
        return final_score

    def find_best_match(self, 
                        target_file: str, 
                        candidates: List[Dict], 
                        threshold: float = 0.7) -> Tuple[Optional[Dict], float]:
        
        # 1. MD5 Fast Match (首选完全匹配)
        target_md5 = self.get_md5(target_file)
        for cand in candidates:
            # 兼容字段名 fingerprint，通常存储的是 md5
            if cand.get('fingerprint') == target_md5:
                return cand, 1.0
                
        # 2. 视觉特征提取与对比
        target_features = self.extract_features(target_file)
        best_score = 0.0
        best_cand = None
        
        for cand in candidates:
            # candidate.fingerprint_text 存储的是特征 JSON 字符串
            try:
                raw_fp = cand.get('fingerprint_text') or '{}'
                cand_features = json.loads(raw_fp)
                if not cand_features: continue
                
                score = self.calculate_score(target_features, cand_features)
                if score > best_score:
                    best_score = score
                    best_cand = cand
            except Exception as e:
                print(f"Match error for candidate {cand.get('id')}: {e}")
                continue
                
        if best_score >= threshold:
            return best_cand, best_score
            
        return None, best_score

# Global instance
engine = FingerprintEngine()
