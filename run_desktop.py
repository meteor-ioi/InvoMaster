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
def setup_logging():
    log_dir = os.path.join(os.path.expanduser('~'), 'IndustryPDF_Logs')
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
        
    log_file = os.path.join(log_dir, 'debug.log')
    err_file = os.path.join(log_dir, 'error.log')
    
    # Configure main logger
    logging.basicConfig(
        filename=log_file,
        level=logging.INFO,
        format='%(asctime)s - [PID:%(process)d] - %(levelname)s - %(message)s',
        force=True
    )
    
    # Redirect stdout/stderr for frozen app to capture C-level or early Python errors
    if getattr(sys, 'frozen', False):
        sys.stdout = open(os.path.join(log_dir, 'stdout.log'), 'a', encoding='utf-8', buffering=1)
        sys.stderr = open(err_file, 'a', encoding='utf-8', buffering=1)

# Initialize logging immediately
setup_logging()
logging.info("Starting application...")
logging.info(f"Python: {sys.version}")
logging.info(f"Platform: {sys.platform}")

# Ensure backend modules can be imported
if getattr(sys, 'frozen', False):
    bundle_root = sys._MEIPASS
    backend_dir = bundle_root
else:
    bundle_root = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(bundle_root, 'backend')

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
logging.info(f"Sys Path updated with: {backend_dir}")

def bootstrap_assets(dest_root):
    """
    Copy bundled assets (models, etc.) to the user data directory.
    """
    if not getattr(sys, 'frozen', False):
        return

    bundle_root = sys._MEIPASS
    
    # 1. Assets (Force update to ensure new icons/resources are applied)
    src_assets = os.path.join(bundle_root, 'assets')
    dest_assets = os.path.join(dest_root, 'assets')
    
    if os.path.exists(src_assets):
        logging.info(f"Bootstrapping assets to {dest_assets}...")
        try:
            shutil.copytree(src_assets, dest_assets, dirs_exist_ok=True)
        except Exception as e:
            logging.error(f"Failed to bootstrap assets: {e}")
            
    # 2. Uploads/Templates structure
    for d in ["uploads", "templates/auto", "templates/custom", "template_sources", "data/models"]:
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
    # Important: Re-raise or exit so we see this in the error log
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
        # Use Config/Server for better robustness
        config = uvicorn.Config(
            app, 
            host="127.0.0.1", 
            port=port, 
            log_level="info", 
            workers=1,
            loop="asyncio"
        )
        server = uvicorn.Server(config)
        server.run()
    except Exception as e:
        logging.error(f"Uvicorn error: {e}", exc_info=True)

def wait_for_server(port, timeout=60):
    """Wait for the server to start listening on the given port."""
    start_time = time.time()
    attempts = 0
    while time.time() - start_time < timeout:
        attempts += 1
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=1):
                logging.info(f"Server is up on port {port}")
                return True
        except (socket.timeout, ConnectionRefusedError):
            if attempts % 5 == 0:
                logging.info(f"Waiting for server... ({attempts})")
            time.sleep(1)
    logging.error(f"Timeout waiting for server on port {port}")
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
        # 0. Check for UNC Path (Windows only)
        # Running from a network share (like \\Mac\Home) is known to cause Uvicorn/Python issues
        current_exe_path = os.path.abspath(sys.executable if getattr(sys, 'frozen', False) else __file__)
        if sys.platform == 'win32' and current_exe_path.startswith('\\\\'):
            msg = "检测到程序正在网络共享路径（UNC）下运行。这可能导致服务启动失败或极度缓慢。\n\n强烈建议将程序文件夹移动到本地磁盘（如 C: 或 D: 盘）后再运行。"
            logging.warning("Running from UNC path: " + current_exe_path)
            # Show message box
            try:
                import ctypes
                ctypes.windll.user32.MessageBoxW(0, msg, "运行环境警告", 0x30)
            except:
                pass

        # Check for pythonnet on Windows
        if sys.platform == 'win32':
            try:
                import clr
                logging.info("Python.NET (clr) is available.")
            except ImportError:
                logging.warning("Python.NET (clr) is NOT available. WebView2 might not work correctly.")

        port = get_free_port()
        logging.info(f"Using port: {port}")

        def get_windows_theme():
            """Checks Windows registry for theme preference (1=Light, 0=Dark)"""
            if sys.platform != 'win32':
                return 'dark' # Default to dark for other platforms
            try:
                import winreg
                registry = winreg.ConnectRegistry(None, winreg.HKEY_CURRENT_USER)
                key = winreg.OpenKey(registry, r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize")
                value, _ = winreg.QueryValueEx(key, "AppsUseLightTheme")
                return 'light' if value == 1 else 'dark'
            except Exception:
                return 'dark'

        system_theme = get_windows_theme()
        bg_color = '#ffffff' if system_theme == 'light' else '#0f172a'
        
        # Bootstrap Assets
        bootstrap_assets(base_path)

        # Initialize API
        js_api = JSApi()

        # 1. Prepare Splash Page URL (Windows Only)
        is_windows = sys.platform == 'win32'
        splash_url = None
        
        if is_windows:
            if getattr(sys, 'frozen', False):
                splash_path = os.path.join(sys._MEIPASS, 'assets', 'splash.html')
            else:
                splash_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets', 'splash.html')
            
            if os.path.exists(splash_path):
                splash_path_url = splash_path.replace("\\", "/")
                splash_url = f'file:///{splash_path_url}'
        
        # On macOS or if splash disabled, go straight to backend
        initial_url = splash_url if (is_windows and splash_url) else f'http://127.0.0.1:{port}'

        # 2. Modify app instance BEFORE starting uvicorn to avoid race conditions!
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

        # 3. Create WebView Window IMMEDIATELY with Splash Page
        logging.info("Starting webview window with initial URL...")
        
        # Initial estimate for creation (will be corrected after window exists)
        base_w, base_h = 1420, 820
        
        window = webview.create_window(
            'InvoMaster', 
            initial_url,
            width=base_w,
            height=base_h,
            resizable=True,
            background_color=bg_color,
            js_api=js_api
        )
        js_api.window = window

        # 4. Start Backend and Redirect when ready
        start_time = time.time()
        
        def redirect_when_ready():
            if wait_for_server(port):
                logging.info("Server is ready, checking minimum wait time...")
                # Ensure at least 6 seconds of splash screen visibility (Windows Only)
                if is_windows:
                    elapsed = time.time() - start_time
                    if elapsed < 6.0:
                        time.sleep(6.0 - elapsed)
                
                logging.info("Redirecting to main app...")
                # Force resize using JS-detected DPI scale from the current (splash) view (Windows Only)
                # This ensures we match the actual rendering scale of the WebView on high-DPI Windows screens.
                # On macOS, window sizing is handled in logical points, so we use 1.0 scale to avoid oversized windows.
                try:
                    if is_windows:
                        dpi_scale = window.evaluate_js('window.devicePixelRatio')
                        if dpi_scale is None: 
                            dpi_scale = 1.0
                        else:
                            dpi_scale = float(dpi_scale)
                    else:
                        dpi_scale = 1.0 # macOS handles high-DPI scaling natively for window sizes
                        
                    target_w = int(1420 * dpi_scale)
                    target_h = int(820 * dpi_scale)
                    
                    logging.info(f"JS DPI Scale: {dpi_scale} -> Resizing to {target_w}x{target_h}")
                    window.resize(target_w, target_h)
                except Exception as e:
                    logging.warning(f"Failed to resize with JS DPI scaling: {e}")
                    window.resize(1420, 820)
                
                window.load_url(f'http://127.0.0.1:{port}')
            else:
                logging.error("Backend server did not start in time.")
                # Show fatal error dialog on Windows
                if sys.platform == 'win32':
                    try:
                        import ctypes
                        ctypes.windll.user32.MessageBoxW(0, "后端服务启动超时，请检查日志或移动到本地磁盘运行。", "启动失败", 0x10)
                    except: pass

        # Start monitoring thread
        monitor_thread = threading.Thread(target=redirect_when_ready, daemon=True)
        monitor_thread.start()

        # Start server thread (daemon)
        server_thread = threading.Thread(target=start_server, args=(port,), daemon=True)
        server_thread.start()

        # 5. Start WebView Main Loop
        gui_engine = 'edgechromium' if sys.platform == 'win32' else None
        logging.info(f"Calling webview.start(gui={gui_engine})...")
        webview.start(gui=gui_engine, debug=False)
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
