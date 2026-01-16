import hashlib
import pdfplumber
import os
import re
import json
from typing import List, Dict, Optional, Tuple
from difflib import SequenceMatcher

class FingerprintEngine:
    def __init__(self):
        pass

    def get_md5(self, file_path: str) -> str:
        hasher = hashlib.md5()
        with open(file_path, 'rb') as f:
            buf = f.read()
            hasher.update(buf)
        return hasher.hexdigest()

    def extract_features(self, file_path: str) -> Dict:
        """
        Extracts lightweight features: Aspect Ratio, Metadata, and Header/Footer text.
        """
        features = {
            "md5": self.get_md5(file_path),
            "aspect_ratio": 0.0,
            "metadata": {},
            "header_text": "",
            "footer_text": ""
        }
        
        try:
            with pdfplumber.open(file_path) as pdf:
                if len(pdf.pages) > 0:
                    page = pdf.pages[0]
                    # 1. Aspect Ratio
                    features["aspect_ratio"] = round(float(page.width) / float(page.height), 3)
                    
                    # 2. Metadata
                    meta = pdf.metadata or {}
                    # Only keep relevant keys to avoid bloat
                    for key in ["Author", "Producer", "Creator"]:
                        if key in meta:
                            features["metadata"][key] = str(meta[key])
                    
                    # 3. Header Text (Top 15%)
                    header_bbox = (0, 0, page.width, page.height * 0.15)
                    header_page = page.within_bbox(header_bbox)
                    features["header_text"] = self._normalize_text(header_page.extract_text() or "")
                    
                    # 4. Footer Text (Bottom 10%)
                    footer_bbox = (0, page.height * 0.90, page.width, page.height)
                    footer_page = page.within_bbox(footer_bbox)
                    features["footer_text"] = self._normalize_text(footer_page.extract_text() or "")
                    
        except Exception as e:
            print(f"Error extracting features: {e}")
            
        return features

    def _normalize_text(self, text: str) -> str:
        # Remove digits, special chars, extra whitespace
        text = re.sub(r'\d+', '', text)
        text = re.sub(r'[^\w\s]', '', text)
        text = re.sub(r'\s+', ' ', text)
        return text.lower().strip()[:500]

    def calculate_score(self, target: Dict, candidate_features: Dict) -> float:
        """
        Weights: 
        Aspect Ratio: Hard Gate (if diff > 0.02, score=0)
        Header Text: 50%
        Footer Text: 30%
        Metadata: 20%
        """
        # 0. Aspect Ratio Filter
        t_ar = target.get("aspect_ratio", 0)
        c_ar = candidate_features.get("aspect_ratio", 0)
        if abs(t_ar - c_ar) > 0.02:
            return 0.0
            
        score = 0.0
        
        # 1. Header Similarity (50%)
        header_sim = SequenceMatcher(None, target.get("header_text", ""), candidate_features.get("header_text", "")).ratio()
        score += header_sim * 0.5
        
        # 2. Footer Similarity (30%)
        footer_sim = SequenceMatcher(None, target.get("footer_text", ""), candidate_features.get("footer_text", "")).ratio()
        score += footer_sim * 0.3
        
        # 3. Metadata Similarity (20%)
        t_meta = target.get("metadata", {})
        c_meta = candidate_features.get("metadata", {})
        meta_matches = 0
        total_meta_keys = len(t_meta)
        if total_meta_keys > 0:
            for k, v in t_meta.items():
                if c_meta.get(k) == v:
                    meta_matches += 1
            score += (meta_matches / total_meta_keys) * 0.2
        else:
            # If no metadata, redistribute weight to header/footer
            score += (header_sim * 0.1 + footer_sim * 0.1)
            
        return score

    def find_best_match(self, 
                        target_file: str, 
                        candidates: List[Dict], 
                        threshold: float = 0.8) -> Tuple[Optional[Dict], float]:
        
        # 1. MD5 Fast Match
        target_md5 = self.get_md5(target_file)
        for cand in candidates:
            if cand.get('fingerprint') == target_md5:
                return cand, 1.0
                
        # 2. Weighted Match
        target_features = self.extract_features(target_file)
        best_score = 0.0
        best_cand = None
        
        for cand in candidates:
            # candidate.fingerprint_text is stored as JSON string of features in our schema
            try:
                cand_features = json.loads(cand.get('fingerprint_text') or '{}')
                if not cand_features: continue
                
                score = self.calculate_score(target_features, cand_features)
                if score > best_score:
                    best_score = score
                    best_cand = cand
            except:
                continue
                
        if best_score >= threshold:
            return best_cand, best_score
            
        return None, best_score

# Global instance
engine = FingerprintEngine()
