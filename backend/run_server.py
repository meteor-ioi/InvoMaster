import uvicorn
import os
import argparse
import config

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the Industry PDF Backend Server")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind the server to")
    args = parser.parse_args()
    
    # Update global config with the port
    config.set_port(args.port)
    
    # Ensure directories (triggered by config import, but explicit check implies intention)
    # config.ensure_directories() is called on import

    print(f"Starting HITL Backend on http://0.0.0.0:{args.port}")
    uvicorn.run("main:app", host="0.0.0.0", port=args.port, reload=not config.is_frozen())
