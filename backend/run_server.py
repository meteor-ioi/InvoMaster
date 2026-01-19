import uvicorn
import os

if __name__ == "__main__":
    # Ensure directories exist
    os.makedirs("data/uploads", exist_ok=True)
    os.makedirs("data/templates", exist_ok=True)
    
    print("Starting HITL Backend on http://0.0.0.0:8291")
    uvicorn.run("main:app", host="0.0.0.0", port=8291, reload=True)
