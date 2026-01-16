import sqlite3
import json
import os
import sys

# Ensure we can import from the current directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import db
from fingerprint import engine as fp_engine

DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'metadata.db')
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), 'data', 'uploads')

def migrate():
    print("Starting fingerprint migration...")
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    # Process AUTO templates first as they rely on fingerprint matching
    c.execute("SELECT id, filename, mode FROM templates")
    rows = c.fetchall()
    
    updated_count = 0
    
    for row in rows:
        t_id = row['id']
        t_json_path = row['filename'] # This is the path to the .json file
        
        # Correct path if it's relative to backend
        if not os.path.isabs(t_json_path):
            t_json_path = os.path.join(os.path.dirname(__file__), t_json_path)
            
        if not os.path.exists(t_json_path):
            print(f"  [Skip] JSON file not found: {t_json_path}")
            continue
            
        try:
            with open(t_json_path, 'r', encoding='utf-8') as f:
                t_data = json.load(f)
            
            # Find the original PDF
            pdf_filename = t_data.get('filename')
            if not pdf_filename:
                print(f"  [Skip] No source PDF filename in JSON for {t_id}")
                continue
                
            pdf_path = os.path.join(UPLOAD_DIR, pdf_filename)
            if not os.path.exists(pdf_path):
                print(f"  [Skip] Source PDF not found: {pdf_path}")
                continue
                
            # Extract new features
            print(f"  [Processing] {t_id} ({t_data.get('name')})")
            features = fp_engine.extract_features(pdf_path)
            features_json = json.dumps(features)
            
            # 1. Update JSON file
            t_data['fingerprint_text'] = features_json
            with open(t_json_path, 'w', encoding='utf-8') as f:
                json.dump(t_data, f, indent=2, ensure_ascii=False)
                
            # 2. Update DB
            c.execute("UPDATE templates SET fingerprint_text = ? WHERE id = ?", (features_json, t_id))
            updated_count += 1
            
        except Exception as e:
            print(f"  [Error] Failed to process {t_id}: {e}")
            
    conn.commit()
    conn.close()
    print(f"Migration finished. Updated {updated_count} templates.")

if __name__ == "__main__":
    migrate()
