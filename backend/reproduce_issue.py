
from fingerprint import FingerprintEngine
import json

def test_false_positive():
    engine = FingerprintEngine()
    
    # Template A: A standard report with a header, some text, and a large table at the bottom
    template_a = {
        "version": "v2_visual",
        "aspect_ratio": 1.414,
        "layout_boxes": [
            [0, 0.5, 0.05, 0.8, 0.05], # Title (Top)
            [1, 0.5, 0.20, 0.8, 0.20], # Text (Upper Body)
            [5, 0.5, 0.70, 0.9, 0.40], # Table (Bottom, Large)
        ]
    }
    
    # Document B: A very different document, maybe a memo with a tiny table in the middle
    # Visually they are very different, but the sequence is Title -> Text -> Table
    document_b = {
        "version": "v2_visual",
        "aspect_ratio": 1.414,
        "layout_boxes": [
            [0, 0.5, 0.05, 0.8, 0.05], # Title
            [1, 0.5, 0.15, 0.8, 0.05], # Text (Short)
            [5, 0.5, 0.30, 0.5, 0.10], # Table (Middle, Small)
            [1, 0.5, 0.60, 0.8, 0.40]  # Text (Bottom, Long) -> Wait, this adds a Text at the end
        ]
    }
    
    # Let's make Document C which has EXACTLY the same sequence but different positions
    # Sequence: Title(0)->T, Text(1)->T, Table(5)->S. Signature: "TS" (because Title and Text map to T)
    # Wait, Title(0) maps to 'T', Plain Text(1) maps to 'T'. 
    # So both A and B might map to "TS" or "TTS" -> Collapsed to "TS"?
    # Let's check map: 0->T, 1->T. 
    # Template A: 0, 1, 5 -> T, T, S -> Collapsed: TS
    # Document C: Title, Table. (0, 5) -> T, S -> Collapsed: TS.
    
    document_c = {
        "version": "v2_visual",
        "aspect_ratio": 1.414,
        "layout_boxes": [
            [0, 0.5, 0.05, 0.8, 0.05], # Title
            # No text body
            [5, 0.5, 0.20, 0.9, 0.10], # Table (Top)
        ]
    }
    
    print(f"Template A Signature: {engine._get_layout_signature(template_a['layout_boxes'])}")
    print(f"Document C Signature: {engine._get_layout_signature(document_c['layout_boxes'])}")
    
    score = engine.calculate_score(template_a, document_c)
    print(f"Similarity Score (Should be low, but likely high): {score:.4f}")
    
    # Another case: Subsequence
    # Template: Title, Text, Table
    # Doc: Title, Text, Table, Text, Text
    # If partial match logic is aggressive, this might score high.

if __name__ == "__main__":
    test_false_positive()
