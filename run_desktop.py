import os
import sys
import threading
import uvicorn
import webview
import time
import socket

import shutil

# Ensure backend modules can be imported
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

def bootstrap_assets(dest_root):
    """
    Copy bundled assets (models, etc.) to the user data directory.
    This is necessary because the bundle is read-only, but the app might expect strictly structure.
    Also ensures models are present.
    """
    if not getattr(sys, 'frozen', False):
        return

    bundle_root = sys._MEIPASS
    
    # 1. Assets
    src_assets = os.path.join(bundle_root, 'assets')
    dest_assets = os.path.join(dest_root, 'assets')
    if os.path.exists(src_assets) and not os.path.exists(dest_assets):
        print(f"Bootstrapping assets to {dest_assets}...")
        shutil.copytree(src_assets, dest_assets)
    
    # 2. Uploads/Templates structure
    for d in ["uploads", "templates/auto", "templates/custom", "template_sources"]:
        target = os.path.join(dest_root, d)
        if not os.path.exists(target):
            os.makedirs(target)

# Configure App Data Directory
app_name = "IndustryPDF"
if sys.platform == 'win32':
    base_path = os.path.join(os.getenv('APPDATA'), app_name)
elif sys.platform == 'darwin':
    base_path = os.path.join(os.path.expanduser('~'), 'Library', 'Application Support', app_name)
else:
    base_path = os.path.join(os.path.expanduser('~'), '.local', 'share', app_name)

if not os.path.exists(base_path):
    os.makedirs(base_path)

os.environ["APP_DATA_DIR"] = base_path
print(f"Data Directory set to: {base_path}")

try:
    from main import app
except ImportError as e:
    print(f"Error importing backend: {e}")
    sys.exit(1)

def get_free_port():
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(('localhost', 0))
    port = sock.getsockname()[1]
    sock.close()
    return port

def start_server(port):
    # Determine if we are running in a bundled environment
    is_bundled = getattr(sys, 'frozen', False)
    
    # Configure static files for frontend
    if is_bundled:
        # In bundled app, frontend dist is in sys._MEIPASS/frontend/dist
        # But we actually want to serve the backend API mostly.
        # If we serve frontend via FastAPI StaticFiles, we need to locate it.
        pass
    
    # Run uvicorn
    # Log level critical to keep stdout clean
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="error")

def main():
    port = get_free_port()
    
    # Bootstrap Assets
    bootstrap_assets(base_path)

    # Start Backend in a separate thread
    t = threading.Thread(target=start_server, args=(port,), daemon=True)
    t.start()
    
    # Wait a bit for server to start
    # In a production app, you might want to poll the health endpoint
    time.sleep(1) 
    
    # Determine the URL
    # If we want to serve the React app locally via a file or via the FastAPI server?
    # Strategy: 
    # 1. We can serve the 'dist' folder via FastAPI as StaticFiles at root "/"
    # 2. Or we can point webview to a file:// URL if it's purely static (but we utilize API)
    # The React app does API calls to / or localhost:8291.
    # If React is served via FastAPI, relative calls "/api/..." work perfectly.
    
    # We need to Mount frontend static files in FastAPI in main.py? 
    # OR we can just point webview to localhost:port assuming main.py serves it.
    
    # Currently backend/main.py only serves UPLOAD_DIR at /static.
    # It does NOT serve the frontend.
    
    # OPTION: Just use file URL for now? 
    # If we use file URL for index.html, API calls need to be absolute URL (http://localhost:port/...)
    # But the built React app probably expects relative paths or configured base.
    # EASIEST: Mount the frontend dist in run_desktop.py dynamically if not present in main.py.
    
    # Let's Modify app instance here to mount static files!
    from fastapi.staticfiles import StaticFiles
    from starlette.responses import FileResponse
    
    # Locate dist folder
    if getattr(sys, 'frozen', False):
        dist_dir = os.path.join(sys._MEIPASS, 'frontend', 'dist')
    else:
        dist_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend', 'dist')
        
    if os.path.exists(dist_dir):
        # Mount /assets
        app.mount("/assets", StaticFiles(directory=os.path.join(dist_dir, "assets")), name="assets")
        
        # Explicit root handler
        @app.get("/")
        async def serve_spa_root():
            return FileResponse(os.path.join(dist_dir, "index.html"))

        # Catch-all for index.html (SPA routing)
        @app.get("/{full_path:path}")
        async def serve_react_app(full_path: str):
            # Check if file exists in dist
            potential_path = os.path.join(dist_dir, full_path)
            if os.path.isfile(potential_path):
                return FileResponse(potential_path)
            # Otherwise return index.html
            return FileResponse(os.path.join(dist_dir, "index.html"))
    else:
        print(f"Warning: Frontend dist not found at {dist_dir}")

    # Start WebView
    webview.create_window(
        '票据识别专家', 
        f'http://127.0.0.1:{port}',
        width=1420,
        height=820,
        resizable=True
    )
    webview.start()

if __name__ == '__main__':
    main()
