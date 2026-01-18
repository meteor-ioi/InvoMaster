import os
import json
import asyncio
import sys

# Add backend directory to path
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
backend_path = os.path.join(project_root, 'backend')
sys.path.append(backend_path)

# Change to project root to ensure data/ paths work
os.chdir(project_root)

from main import Region, extract_text_from_regions, pdf_to_images, UPLOAD_DIR
from database import Database

async def cache_all_templates():
    db = Database()
    templates = db.list_templates()
    print(f"Found {len(templates)} templates to check.")

    for t in templates:
        t_id = t['id']
        t_path = t['filename']
        source_path = os.path.join("data", "library", f"{t_id}.pdf")
        
        if not os.path.exists(t_path):
            print(f"Skipping {t_id}: Template JSON not found at {t_path}")
            continue
            
        if not os.path.exists(source_path):
            print(f"Skipping {t_id}: Source PDF not found at {source_path}")
            continue

        with open(t_path, "r", encoding="utf-8") as f:
            t_data = json.load(f)
            regions_data = t_data.get("regions", [])

        # Check if already cached
        has_all_content = all("content" in r and r["content"] is not None for r in regions_data)
        if has_all_content:
            print(f"Template {t_id} is already fully cached. Skipping.")
            continue

        print(f"Caching template {t_id} ({t['name']})...")
        
        # 1. Ensure images are cached
        img_subdir = f"images_{t['fingerprint'][:8]}"
        img_save_path = os.path.join(UPLOAD_DIR, img_subdir)
        pdf_to_images(source_path, img_save_path)
        
        # 2. Extract content
        regions_objs = [Region(**r) for r in regions_data]
        matching_regions = extract_text_from_regions(source_path, regions_objs)
        
        # 3. Save back to JSON
        t_data["regions"] = matching_regions
        with open(t_path, "w", encoding="utf-8") as f:
            json.dump(t_data, f, indent=2, ensure_ascii=False)
            
        print(f"Finished caching {t_id}.")

if __name__ == "__main__":
    asyncio.run(cache_all_templates())
