import requests
import os
import sys

# Constants
API_URL = "http://localhost:8291/analyze"
TEST_FILE = "dummy_test.pdf"

if not os.path.exists(TEST_FILE):
    print(f"Test file {TEST_FILE} not found!")
    sys.exit(1)

def test_auto_mode_no_fallback():
    print("\n--- Testing AUTO Mode (No Fallback) ---")
    with open(TEST_FILE, 'rb') as f:
        files = {'file': f}
        # default params: fallback_to_layout is False by default
        response = requests.post(API_URL, files=files)
    
    try:
        data = response.json()
    except Exception as e:
        print(f"❌ JSON Decode Error: {e}")
        print(f"Response Content: {response.text}")
        return

    print(f"Status Code: {response.status_code}")
    print(f"Response Status: {data.get('status')}")
    print(f"Message: {data.get('message')}")
    print(f"Template Found: {data.get('template_found')}")
    print(f"Regions Count: {len(data.get('regions', []))}")
    
    # Assertions
    if data.get('status') == 'error' and data.get('message') == '未匹配到模板' and not data.get('regions'):
        print("✅ PASS: AUTO mode correctly reported no match with no regions.")
    elif data.get('template_found'): 
        print("⚠️ WARNING: A template WAS matched. Cannot verify empty state properly unless we use a file with no template.")
    else:
        print("❌ FAIL: Unexpected response for AUTO mode.")
        print(data)

def test_template_creation_mode_with_fallback():
    print("\n--- Testing Template Creation Mode (With Fallback) ---")
    with open(TEST_FILE, 'rb') as f:
        files = {'file': f}
        params = {'fallback_to_layout': 'true'}
        response = requests.post(API_URL, files=files, params=params)
    
    data = response.json()
    print(f"Status Code: {response.status_code}")
    print(f"Response Status: {data.get('status')}")
    print(f"Message: {data.get('message')}")
    print(f"Template Found: {data.get('template_found')}")
    print(f"Regions Count: {len(data.get('regions', []))}")
    
    # Assertions
    if data.get('status') == 'success' and not data.get('template_found') and len(data.get('regions', [])) > 0:
        print("✅ PASS: Fallback mode correctly returned layout regions without matching a template.")
    elif data.get('template_found'):
         print("⚠️ WARNING: A template WAS matched. Fallback test overridden by actual match.")
    else:
        print("❌ FAIL: Unexpected response for Fallback mode.")
        print(data)

if __name__ == "__main__":
    try:
        test_auto_mode_no_fallback()
        test_template_creation_mode_with_fallback()
    except Exception as e:
        print(f"❌ Error during test: {e}")
