from fingerprint import FingerprintEngine
import json

def test_robustness():
    engine = FingerprintEngine()
    
    # Simulate a target with 5 boxes
    target = {
        "version": "v2_visual",
        "aspect_ratio": 1.4,
        "layout_boxes": [
            [0, 0.5, 0.1, 0.2, 0.05], # Title
            [1, 0.5, 0.2, 0.8, 0.1],  # Text
            [5, 0.5, 0.5, 0.9, 0.3],  # Table
            [1, 0.5, 0.8, 0.8, 0.1],  # Text 2
            [2, 0.5, 0.95, 0.3, 0.05] # Footer
        ]
    }
    
    # Case 1: Minor Y shift in table and subsequent boxes
    cand1 = {
        "version": "v2_visual",
        "aspect_ratio": 1.41,
        "layout_boxes": [
            [0, 0.5, 0.1, 0.2, 0.05], 
            [1, 0.5, 0.2, 0.8, 0.1],  
            [5, 0.5, 0.55, 0.9, 0.35], # Y shifted 0.05, height changed
            [1, 0.5, 0.85, 0.8, 0.1],  # Y shifted 0.05
            [2, 0.5, 0.98, 0.3, 0.05]  # Y shifted 0.03
        ]
    }
    
    # Case 2: One missing box in the middle
    cand2 = {
        "version": "v2_visual",
        "aspect_ratio": 1.4,
        "layout_boxes": [
            [0, 0.5, 0.1, 0.2, 0.05], 
            [1, 0.5, 0.2, 0.8, 0.1],  
            # Table missing!
            [1, 0.5, 0.8, 0.8, 0.1],  
            [2, 0.5, 0.95, 0.3, 0.05] 
        ]
    }

    score1 = engine.calculate_score(target, cand1)
    score2 = engine.calculate_score(target, cand2)
    
    print(f"Case 1 (Minor Shifts) Score: {score1:.4f}")
    print(f"Case 2 (Missing Box) Score: {score2:.4f}")

if __name__ == "__main__":
    test_robustness()
