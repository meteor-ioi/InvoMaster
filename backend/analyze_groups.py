import os
import glob
from fingerprint import engine
from difflib import SequenceMatcher

def analyze_group(group_name, dir_path):
    print(f"\n{'='*20} Analyzing Group: {group_name} {'='*20}")
    
    files = sorted(glob.glob(os.path.join(dir_path, "*.pdf")) + glob.glob(os.path.join(dir_path, "*.PDF")))
    if not files:
        print("No PDF files found.")
        return

    features_list = []
    for f in files:
        fname = os.path.basename(f)
        try:
            feats = engine.extract_features(f)
            # Use internal helper to get signature for debugging display
            sig = engine._get_layout_signature(feats['layout_boxes'])
            features_list.append({
                "name": fname,
                "path": f,
                "features": feats,
                "signature": sig,
                "box_count": len(feats['layout_boxes']),
                "aspect_ratio": feats["aspect_ratio"]
            })
        except Exception as e:
            print(f"Error processing {fname}: {e}")

    # Print Feature Summary
    print(f"{'Filename':<30} | {'Boxes':<5} | {'AR':<6} | {'Signature'}")
    print("-" * 80)
    for item in features_list:
        print(f"{item['name'][:30]:<30} | {item['box_count']:<5} | {item['aspect_ratio']:<6.3f} | {item['signature']}")

    # Print Matrix
    print("\nSimilarity Matrix:")
    # Header
    print(f"{'':<20}", end="")
    for item in features_list:
        # shorten name for column header
        short_name = (item['name'][:10] + '..') if len(item['name']) > 12 else item['name']
        print(f"{short_name:<15}", end="")
    print()

    for i, item1 in enumerate(features_list):
        # Row Header
        short_name = (item1['name'][:15] + '..') if len(item1['name']) > 17 else item1['name']
        print(f"{short_name:<20}", end="")
        
        for j, item2 in enumerate(features_list):
            if i == j:
                score = 1.0
            else:
                score = engine.calculate_score(item1['features'], item2['features'])
            
            # Highlight low scores
            score_str = f"{score:.4f}"
            if score < 0.8:
                score_str += " (!)"
            
            print(f"{score_str:<15}", end="")
        print()
        
    # Deep Dive into Mismatches
    print("\n--- Mismatch Analysis (< 0.8) ---")
    base_item = features_list[0] # Compare everyone to the first one as a baseline
    for i in range(1, len(features_list)):
        target_item = features_list[i]
        score = engine.calculate_score(base_item['features'], target_item['features'])
        
        if score < 0.8:
            print(f"Comparing {base_item['name']} <-> {target_item['name']} (Score: {score:.4f})")
            
            # 1. Aspect Ratio
            ar_diff = abs(base_item['aspect_ratio'] - target_item['aspect_ratio'])
            if ar_diff > 0.05:
                print(f"  [!] Aspect Ratio Mismatch: {base_item['aspect_ratio']} vs {target_item['aspect_ratio']}")
            
            # 2. Sequence
            sig1 = base_item['signature']
            sig2 = target_item['signature']
            matcher = SequenceMatcher(None, sig1, sig2)
            seq_sim = matcher.ratio()
            print(f"  Sequence Similarity: {seq_sim:.4f}")
            print(f"  Sig1: {sig1}")
            print(f"  Sig2: {sig2}")
            
            # Show diff
            print("  Differences:")
            for opcode in matcher.get_opcodes():
                tag, i1, i2, j1, j2 = opcode
                if tag != 'equal':
                    print(f"    {tag}: {sig1[i1:i2]} -> {sig2[j1:j2]}")

if __name__ == "__main__":
    groups = {
        "Group 2": "/Users/icychick/Projects/industry_PDF/PDF测试汇总/同类型-2 组",
        "Group 3": "/Users/icychick/Projects/industry_PDF/PDF测试汇总/同类型-3 组",
        "Group 4": "/Users/icychick/Projects/industry_PDF/PDF测试汇总/同类型-4 组",
        "Group 5": "/Users/icychick/Projects/industry_PDF/PDF测试汇总/同类型-5 组",
    }
    
    for name, path in groups.items():
        analyze_group(name, path)
