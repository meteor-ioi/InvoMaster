import os
import sys
import threading
import uvicorn
import webview
import time
import socket
import shutil
import logging

import multiprocessing

# Configure Logging
log_file = os.path.join(os.path.expanduser('~'), 'industry_pdf_debug.log')
logging.basicConfig(
    filename=log_file,
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logging.info("Starting application...")

# Ensure backend modules can be imported
if getattr(sys, 'frozen', False):
    bundle_root = sys._MEIPASS
    backend_dir = bundle_root # In frozen app, backend is usually at root or explicitly added
else:
    bundle_root = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(bundle_root, 'backend')

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
logging.info(f"Sys Path updated with: {backend_dir}")

def bootstrap_assets(dest_root):
    """
    Copy bundled assets (models, etc.) to the user data directory.
    This is necessary because the bundle is read-only, but the app might expect strictly structure.
    Also ensures models are present.
    """
    if not getattr(sys, 'frozen', False):
        return

    bundle_root = sys._MEIPASS
    
    # 1. Assets (Force update to ensure new icons/resources are applied)
    src_assets = os.path.join(bundle_root, 'assets')
    dest_assets = os.path.join(dest_root, 'assets')
    
    if os.path.exists(src_assets):
        logging.info(f"Bootstrapping assets to {dest_assets} (dirs_exist_ok=True)...")
        try:
            shutil.copytree(src_assets, dest_assets, dirs_exist_ok=True)
        except Exception as e:
            logging.error(f"Failed to bootstrap assets: {e}")
    
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
logging.info(f"Data Directory set to: {base_path}")

try:
    logging.info("Attempting to import backend 'main' module...")
    from main import app
    logging.info("Backend 'main' module imported successfully.")
except Exception as e:
    logging.error(f"Error importing backend: {e}", exc_info=True)
    sys.exit(1)

def get_free_port():
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(('localhost', 0))
    port = sock.getsockname()[1]
    sock.close()
    return port

def start_server(port):
    logging.info(f"Starting uvicorn on port {port}...")
    try:
        uvicorn.run(app, host="127.0.0.1", port=port, log_level="error")
    except Exception as e:
        logging.error(f"Uvicorn error: {e}", exc_info=True)

def wait_for_server(port, timeout=30):
    """Wait for the server to start listening on the given port."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=1):
                logging.info(f"Server is up and listening on port {port}")
                return True
        except (socket.timeout, ConnectionRefusedError):
            time.sleep(0.5)
    logging.error(f"Server failed to start on port {port} within {timeout} seconds")
    return False

try:
    if sys.platform == 'win32':
        import ctypes
        ctypes.windll.shcore.SetProcessDpiAwareness(1)
except Exception as e:
    logging.warning(f"Failed to set DPI awareness: {e}")

class JSApi:
    def __init__(self):
        self.window = None

    def save_file(self, content, filename):
        """
        Open a native save file dialog and write content to the selected path.
        """
        if not self.window:
            return False
            
        file_types = ('All files (*.*)',)
        if filename.endswith('.json'): file_types = ('JSON files (*.json)', 'All files (*.*)')
        elif filename.endswith('.csv'): file_types = ('CSV files (*.csv)', 'All files (*.*)')
        elif filename.endswith('.md'): file_types = ('Markdown files (*.md)', 'All files (*.*)')
        elif filename.endswith('.xml'): file_types = ('XML files (*.xml)', 'All files (*.*)')
        
        try:
            result = self.window.create_file_dialog(
                webview.SAVE_DIALOG, 
                save_filename=filename, 
                file_types=file_types
            )
            
            if result:
                # result is the path string
                with open(result, 'w', encoding='utf-8') as f:
                    f.write(content)
                return True
        except Exception as e:
            logging.error(f"Error saving file: {e}")
            
        return False

def main():
    try:
        # Check for pythonnet on Windows
        if sys.platform == 'win32':
            try:
                import clr
                logging.info("Python.NET (clr) is available.")
            except ImportError:
                logging.warning("Python.NET (clr) is NOT available. WebView2 might not work correctly.")

        port = get_free_port()
        logging.info(f"Using port: {port}")
        
        # Bootstrap Assets
        bootstrap_assets(base_path)

        # Initialize API
        js_api = JSApi()

        # 1. Let's Modify app instance BEFORE starting uvicorn to avoid race conditions!
        from fastapi.staticfiles import StaticFiles
        from starlette.responses import FileResponse
        
        # Locate dist folder
        if getattr(sys, 'frozen', False):
            dist_dir = os.path.join(sys._MEIPASS, 'frontend', 'dist')
        else:
            dist_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend', 'dist')
            
        if os.path.exists(dist_dir):
            logging.info(f"Found frontend at {dist_dir}, mounting routes...")
            # Mount /assets
            app.mount("/assets", StaticFiles(directory=os.path.join(dist_dir, "assets")), name="assets")
            
            # Explicit root handler
            @app.get("/")
            async def serve_spa_root():
                return FileResponse(os.path.join(dist_dir, "index.html"))

            # Catch-all for index.html (SPA routing)
            @app.get("/{full_path:path}")
            async def serve_react_app(full_path: str):
                potential_path = os.path.join(dist_dir, full_path)
                if os.path.isfile(potential_path):
                    return FileResponse(potential_path)
                return FileResponse(os.path.join(dist_dir, "index.html"))
        else:
            logging.warning(f"Frontend dist not found at {dist_dir}")

        # 2. Start Backend in a separate thread
        t = threading.Thread(target=start_server, args=(port,), daemon=True)
        t.start()
        
        # 3. Wait for server to start
        if not wait_for_server(port):
            logging.error("Backend server did not start in time. Exiting.")
            return

        # 4. Start WebView
        logging.info("Starting webview window...")
        
        # Important: window must be created BEFORE start()
        window = webview.create_window(
            '票据识别专家', 
            f'http://127.0.0.1:{port}',
            width=1420,
            height=820,
            resizable=True,
            background_color='#0f172a', # Prevent white flash, match dark theme
            js_api=js_api
        )
        js_api.window = window
        
        # On Windows, force edgechromium (WebView2)
        gui_engine = 'edgechromium' if sys.platform == 'win32' else None
        
        logging.info(f"Calling webview.start(gui={gui_engine})...")
        webview.start(gui=gui_engine, debug=True) # debug=True can provide more info in logs if supported
        logging.info("Webview closed.")
        
    except Exception as e:
        logging.error(f"Application error: {e}", exc_info=True)
        # On Windows, if we are in a non-console app, show a message box for fatal errors
        if sys.platform == 'win32' and not sys.stdout:
            try:
                import ctypes
                ctypes.windll.user32.MessageBoxW(0, f"Application Error: {str(e)}", "Fatal Error", 0x10)
            except:
                pass

if __name__ == '__main__':
    multiprocessing.freeze_support()
    main()
