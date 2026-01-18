from fingerprint import engine
import os
import json

def test():
    base_dir = "data/uploads"
    files = ["样本.pdf", "样本1.pdf", "样本2.pdf", "发票格式.pdf"]
    
    # 过滤掉不存在的文件
    valid_files = [os.path.join(base_dir, f) for f in files if os.path.exists(os.path.join(base_dir, f))]
    
    if len(valid_files) < 2:
        print("Not enough files for testing in data/uploads")
        return

    features = {}
    print("--- Extracting Features ---")
    for f_path in valid_files:
        print(f"Extracting: {f_path}")
        feat = engine.extract_features(f_path)
        features[f_path] = feat
        print(f"  Version: {feat.get('version')}")
        print(f"  Boxes: {len(feat.get('layout_boxes', []))}")

    print("\n--- Cross Comparison ---")
    for i, f1 in enumerate(valid_files):
        for j, f2 in enumerate(valid_files):
            if i >= j: continue
            score = engine.calculate_score(features[f1], features[f2])
            print(f"Similarity [{os.path.basename(f1)}] vs [{os.path.basename(f2)}]: {score:.4f}")

if __name__ == "__main__":
    test()
