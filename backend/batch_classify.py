import os
import shutil
import json
from fingerprint import engine

def batch_classify_pdfs(source_dir, threshold=0.8):
    # 1. 获取所有 PDF 文件
    files = [f for f in os.listdir(source_dir) if f.lower().endswith('.pdf')]
    if not files:
        print("未发现 PDF 文件。")
        return

    # 2. 存储分组信息
    # groups = [ { "leader_features": feat, "files": [path1, path2...] }, ... ]
    groups = []
    
    print(f"开始处理 {len(files)} 个文件...")

    for filename in files:
        file_path = os.path.join(source_dir, filename)
        try:
            print(f"分析文件: {filename}")
            features = engine.extract_features(file_path)
            
            # 与已有分组的 leader 进行对比
            matched_group_idx = -1
            best_score = 0
            
            for idx, group in enumerate(groups):
                score = engine.calculate_score(features, group["leader_features"])
                if score > threshold and score > best_score:
                    best_score = score
                    matched_group_idx = idx
            
            if matched_group_idx != -1:
                groups[matched_group_idx]["files"].append(file_path)
                print(f"  -> 归入分组 {matched_group_idx + 1:02d} (得分: {best_score:.4f})")
            else:
                groups.append({
                    "leader_features": features,
                    "files": [file_path]
                })
                print(f"  -> 创建新分组 {len(groups):02d}")
                
        except Exception as e:
            print(f"处理文件 {filename} 出错: {e}")

    # 3. 创建文件夹并移动文件
    output_base = os.path.join(source_dir, "Classified_Results")
    if os.path.exists(output_base):
        shutil.rmtree(output_base)
    os.makedirs(output_base)

    print("\n--- 分类完成，正在移动文件 ---")
    for idx, group in enumerate(groups):
        folder_name = f"{idx + 1:02d}"
        target_dir = os.path.join(output_base, folder_name)
        os.makedirs(target_dir, exist_ok=True)
        
        for file_path in group["files"]:
            shutil.copy(file_path, target_dir)
            
    print(f"结果已保存至: {output_base}")
    print(f"共发现 {len(groups)} 个不同类型的文档。")

if __name__ == "__main__":
    source = "/Users/icychick/Projects/industry_PDF/PDF测试汇总"
    batch_classify_pdfs(source)
