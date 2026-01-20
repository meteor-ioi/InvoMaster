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
                    
                    # 执行推理 - 使用较低的置信度 (0.1) 以捕获不稳定的布局特征，提高模板匹配的通用性
                    # 较低的阈值能捕获到 3-1.PDF 这种置信度偏低的表格区域
                    regions = engine_instance.predict(first_page_img, conf=0.1, imgsz=1024)
                    
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
                    
                    # 按 Y 轴中心点排序，确保指纹序列的一致性
                    layout_data.sort(key=lambda x: x[2])
                    features["layout_boxes"] = layout_data
                    
        except Exception as e:
            print(f"Error extracting visual features: {e}")
            
        return features

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

    def calculate_score(self, target: Dict, candidate_features: Dict) -> float:
        """
        Calculates similarity using visual layout alignment.
        1. Aspect Ratio (Hard gate) - Relaxed to 0.05
        2. Layout Category Sequence (70%)
        3. Spatial Position Correlation (30%) - Sequence aligned
        """
        # 0. 版本兼容性检查 (如果候选是旧版，返回 0)
        if candidate_features.get("version") != "v2_visual":
            return 0.0

        # 1. 宽高比硬过滤 (容差从 0.03 放宽到 0.05)
        t_ar = target.get("aspect_ratio", 0)
        c_ar = candidate_features.get("aspect_ratio", 0)
        if abs(t_ar - c_ar) > 0.05:
            return 0.0
            
        t_boxes = target.get("layout_boxes", [])
        c_boxes = candidate_features.get("layout_boxes", [])
        
        if not t_boxes or not c_boxes:
            return 0.0
            
        # 2. 类别序列相似度 (Sequence Similarity)
        t_sig = self._get_layout_signature(t_boxes)
        c_sig = self._get_layout_signature(c_boxes)
        
        matcher = SequenceMatcher(None, t_sig, c_sig)
        seq_sim = matcher.ratio()
        
        # 3. Subsequence Boost (子序列增强)
        # 解决"填满的表格" vs "空表格"导致的指纹长度不一致问题
        # 如果一者是另一者的子序列，且长度占比不低于 30%，则给予保底高分
        if seq_sim < 0.85:
            len_t = len(t_sig)
            len_c = len(c_sig)
            if len_t > 0 and len_c > 0:
                is_sub = False
                if len_t < len_c:
                    is_sub = self.is_subsequence(t_sig, c_sig)
                else:
                    is_sub = self.is_subsequence(c_sig, t_sig)
                
                if is_sub:
                    # 长度差异惩罚：差异越大，置信度越低，但给予保底
                    # Example: T vs TSTS. Len 1 vs 4. Ratio 0.25. 
                    # We want to boost this, but not to 1.0. Maybe 0.8?
                    min_len = min(len_t, len_c)
                    max_len = max(len_t, len_c)
                    
                    if min_len / max_len > 0.3: 
                        seq_sim = max(seq_sim, 0.85)
                    else:
                        seq_sim = max(seq_sim, 0.65) # 极短子序列给 0.65

        # 4. 空间检查 (Spatial Check) - 简化逻辑
        # 由于引入了塌缩和子序列逻辑，严格的空间对齐已不可行。
        # 仅当序列相似度极高时 (>0.85)，我们才认为它们是"同一个模板"，此时空间偏移通常也很小。
        # 如果是"同类型但不完全一致"，我们主要通过 Seq Sim 来判定。
        # 因此，直接返回优化后的序列得分。
        
        return seq_sim

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
