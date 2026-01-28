
import requests
import os
import time

# Configuration
API_BASE = "http://localhost:8291"
TEST_TEMPLATE_ID = "test_png_persist"
TEST_IMG_PATH = "test_upload.png"

# 1. Create a dummy PNG
from PIL import Image
img = Image.new('RGB', (100, 100), color='green')
img.save(TEST_IMG_PATH)

print(f"Created test image: {TEST_IMG_PATH}")

try:
    # 2. Upload file implicitly via analyze (to get it into uploads dir)
    # Actually, we can just manually put it in uploads for simulation or use analyze endpoint
    # Let's use Requests to simulate real flow
    
    with open(TEST_IMG_PATH, 'rb') as f:
        files = {'file': (TEST_IMG_PATH, f, 'image/png')}
        res = requests.post(f"{API_BASE}/analyze", files=files, data={"device": "cpu"})
        print(f"Analyze response: {res.status_code}")
        if res.status_code != 200:
            print(res.text)
            exit(1)
        data = res.json()
        filename = data['filename']
        print(f"Uploaded filename: {filename}")

    # 3. Save Template
    # We need to send the template definition
    template_payload = {
        "id": TEST_TEMPLATE_ID,
        "name": "Test PNG Persistence",
        "filename": filename, # This should trigger the copy logic
        "regions": [], # Empty for test
        "mode": "custom"
    }
    
    res = requests.post(f"{API_BASE}/templates", json=template_payload)
    print(f"Save Template response: {res.status_code}")
    if res.status_code != 200:
        print(res.text)
        exit(1)

    # 4. Verify file exists in source dir with correct extension
    # We can't easily check server disk from here unless we assume local dev env
    # Check if we can "Analyze from source" which effectively verifies it
    
    print("Waiting for file operations...")
    time.sleep(1)
    
    # 5. Analyze from source (Load Template)
    res = requests.get(f"{API_BASE}/templates/{TEST_TEMPLATE_ID}/analyze")
    print(f"Load Template response: {res.status_code}")
    if res.status_code == 200:
        print("SUCCESS: Template loaded from source!")
        print(f"Returned filename: {res.json().get('filename')}")
    else:
        print("FAILURE: Could not load template from source.")
        print(res.text)

    # 6. Delete Template
    res = requests.delete(f"{API_BASE}/templates/{TEST_TEMPLATE_ID}")
    print(f"Delete Template response: {res.status_code}")
    
    # Verify cleanup (optional, if we have access to disk)
    # We can try to load again, should be 404
    res = requests.get(f"{API_BASE}/templates/{TEST_TEMPLATE_ID}/analyze")
    if res.status_code == 404:
        print("SUCCESS: Template cleanly deleted (404 on reload)")
    else:
        print(f"WARNING: Template might still exist? Status: {res.status_code}")

except Exception as e:
    print(f"Test failed with exception: {e}")
finally:
    # Cleanup local test file
    if os.path.exists(TEST_IMG_PATH):
        os.remove(TEST_IMG_PATH)
