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
                    
                    # 执行推理
                    regions = engine_instance.predict(first_page_img, conf=0.25, imgsz=1024)
                    
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
        # 将类别 ID 转换为字符序列，便于 SequenceMatcher 进行快速模糊匹配
        return "".join([chr(65 + b[0]) for b in boxes])

    def calculate_score(self, target: Dict, candidate_features: Dict) -> float:
        """
        Calculates similarity using visual layout alignment.
        1. Aspect Ratio (Hard gate)
        2. Layout Category Sequence (60%)
        3. Spatial Position Correlation (40%)
        """
        # 0. 版本兼容性检查 (如果候选是旧版，返回 0)
        if candidate_features.get("version") != "v2_visual":
            return 0.0

        # 1. 宽高比硬过滤 (容差 0.03)
        t_ar = target.get("aspect_ratio", 0)
        c_ar = candidate_features.get("aspect_ratio", 0)
        if abs(t_ar - c_ar) > 0.03:
            return 0.0
            
        t_boxes = target.get("layout_boxes", [])
        c_boxes = candidate_features.get("layout_boxes", [])
        
        if not t_boxes or not c_boxes:
            return 0.0
            
        # 2. 类别序列相似度 (60%)
        # 按 Y 轴排序已在 extract_features 中完成
        t_sig = self._get_layout_signature(t_boxes)
        c_sig = self._get_layout_signature(c_boxes)
        
        seq_sim = SequenceMatcher(None, t_sig, c_sig).ratio()
        
        # 如果序列差异过大，直接返回
        if seq_sim < 0.4:
            return seq_sim * 0.6
            
        # 3. 空间位置校验 (40%)
        # 简单的线性对比（由于已排序并归一化）
        # 我们取前 N 个匹配的区块计算 Y 轴偏差均值
        y_diffs = []
        min_len = min(len(t_boxes), len(c_boxes))
        for i in range(min_len):
            if t_boxes[i][0] == c_boxes[i][0]: # 类别相同才比对坐标
                diff = abs(t_boxes[i][2] - c_boxes[i][2]) # Y_center 偏差
                y_diffs.append(max(0, 1 - (diff * 5))) # 偏差越大得分越低，20% 偏差即为 0
        
        spatial_sim = sum(y_diffs) / min_len if y_diffs else 0.0
            
        return (seq_sim * 0.6) + (spatial_sim * 0.4)

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
