import sys
import os
import json
from fingerprint import engine

def analyze_pdfs(file_paths):
    features_list = []
    print("--- Feature Extraction ---")
    for path in file_paths:
        if not os.path.exists(path):
            print(f"File not found: {path}")
            continue
        
        print(f"\nAnalyzing: {os.path.basename(path)}")
        features = engine.extract_features(path)
        features_list.append((path, features))
        
        print(f"  Aspect Ratio: {features['aspect_ratio']}")
        print(f"  Boxes Count: {len(features['layout_boxes'])}")
        sig = engine._get_layout_signature(features['layout_boxes'])
        print(f"  Signature: {sig}")
        # Print first few boxes details for alignment check
        for i, box in enumerate(features['layout_boxes'][:5]):
            print(f"    Box {i}: Class={box[0]}, Y_center={box[2]}")

    print("\n--- Similarity Matrix ---")
    filenames = [os.path.basename(p) for p, f in features_list]
    print(f"{'':<15}", end="")
    for name in filenames:
        print(f"{name:<15}", end="")
    print()

    for i, (path1, feat1) in enumerate(features_list):
        print(f"{filenames[i]:<15}", end="")
        for j, (path2, feat2) in enumerate(features_list):
            if i == j:
                print(f"{1.0:<15.4f}", end="")
            else:
                score = engine.calculate_score(feat1, feat2)
                print(f"{score:<15.4f}", end="")
        print()

if __name__ == "__main__":
    files = [
        "/Users/icychick/Projects/industry_PDF/PDF/样本.pdf",
        "/Users/icychick/Projects/industry_PDF/PDF/样本1.pdf",
        "/Users/icychick/Projects/industry_PDF/PDF/样本2.pdf",
        "/Users/icychick/Projects/industry_PDF/PDF/样本3.pdf"
    ]
    analyze_pdfs(files)
