import uvicorn
import os

if __name__ == "__main__":
    # Ensure correct data directory is used (relative to this script)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(script_dir, "data")
    os.environ["APP_DATA_DIR"] = data_dir
    
    # Ensure directories exist
    os.makedirs(os.path.join(data_dir, "uploads"), exist_ok=True)
    os.makedirs(os.path.join(data_dir, "templates"), exist_ok=True)
    
    print(f"Starting HITL Backend on http://0.0.0.0:8291")
    print(f"Data directory: {data_dir}")
    
    uvicorn.run("main:app", host="0.0.0.0", port=8291, reload=True)
