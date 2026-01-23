#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
InvoMaster Desktop 主入口

单 exe 双模式架构：
- 默认模式：pywebview 前端 GUI
- --backend 模式：uvicorn 后端服务

通过命令行参数 --backend --port XXX 启动后端模式，
主进程会 spawn 自己的另一个实例作为后端子进程。
"""

import os
import sys
import subprocess
import threading
import time
import socket
import atexit
import logging
import urllib.request
import urllib.error
import argparse
import shutil

# ============== 日志配置 ==============
def setup_logging(mode="frontend"):
    log_dir = os.path.join(os.path.expanduser('~'), 'IndustryPDF_Logs')
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
        
    log_file = os.path.join(log_dir, f'{mode}.log')
    
    logging.basicConfig(
        filename=log_file,
        level=logging.INFO,
        format=f'%(asctime)s - [{mode.upper()}:%(process)d] - %(levelname)s - %(message)s',
        force=True
    )
    
    if getattr(sys, 'frozen', False):
        sys.stdout = open(os.path.join(log_dir, f'{mode}_stdout.log'), 'a', encoding='utf-8', buffering=1)
        sys.stderr = open(os.path.join(log_dir, f'{mode}_stderr.log'), 'a', encoding='utf-8', buffering=1)

# ============== 全局变量 ==============
backend_process = None
SPLASH_DURATION = 15  # 欢迎动画持续时间（秒）

# ============== 数据目录配置 ==============
def setup_data_directory():
    """配置应用数据目录"""
    app_name = "IndustryPDF"
    
    if getattr(sys, 'frozen', False):
        app_root = os.path.dirname(sys.executable)
    else:
        app_root = os.path.dirname(os.path.abspath(__file__))
    
    portable_data_path = os.path.join(app_root, 'data')
    is_portable = os.path.exists(portable_data_path) or os.path.exists(os.path.join(app_root, '.portable'))

    if is_portable:
        base_path = portable_data_path
        mode_str = "PORTABLE"
    else:
        if sys.platform == 'win32':
            base_path = os.path.join(os.getenv('APPDATA'), app_name)
        elif sys.platform == 'darwin':
            base_path = os.path.join(os.path.expanduser('~'), 'Library', 'Application Support', app_name)
        else:
            base_path = os.path.join(os.path.expanduser('~'), '.local', 'share', app_name)
        mode_str = "SYSTEM"

    if not os.path.exists(base_path):
        try:
            os.makedirs(base_path, exist_ok=True)
        except Exception as e:
            logging.error(f"Failed to create data directory {base_path}: {e}")

    os.environ["APP_DATA_DIR"] = base_path
    logging.info(f"Data Directory set to ({mode_str}): {base_path}")
    return base_path

# ============== 端口管理 ==============
def get_free_port():
    """获取可用端口"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(('localhost', 0))
    port = sock.getsockname()[1]
    sock.close()
    return port

# ============== 后端进程管理 ==============
def start_backend_process(port):
    """启动后端子进程（使用自己作为后端）"""
    global backend_process
    
    if getattr(sys, 'frozen', False):
        # 打包环境：使用自己，加上 --backend 参数
        cmd = [sys.executable, '--backend', '--port', str(port)]
        cwd = os.path.dirname(sys.executable)
    else:
        # 开发环境：使用 python 运行自己
        script_path = os.path.abspath(__file__)
        cmd = [sys.executable, script_path, '--backend', '--port', str(port)]
        cwd = os.path.dirname(os.path.abspath(__file__))
    
    logging.info(f"Starting backend process: {' '.join(cmd)}")
    logging.info(f"Working directory: {cwd}")
    
    # Windows 下使用 CREATE_NO_WINDOW 避免弹出控制台
    creation_flags = 0
    if sys.platform == 'win32':
        creation_flags = subprocess.CREATE_NO_WINDOW
    
    try:
        backend_process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            creationflags=creation_flags,
            cwd=cwd
        )
        logging.info(f"Backend process started with PID: {backend_process.pid}")
        return backend_process
    except Exception as e:
        logging.error(f"Failed to start backend process: {e}", exc_info=True)
        return None

def cleanup_backend():
    """确保后端进程退出"""
    global backend_process
    if backend_process and backend_process.poll() is None:
        logging.info(f"Terminating backend process (PID: {backend_process.pid})...")
        try:
            if sys.platform == 'win32':
                # Windows: 使用 taskkill /T 确保子进程树也被终止
                subprocess.call(
                    ['taskkill', '/F', '/T', '/PID', str(backend_process.pid)],
                    creationflags=subprocess.CREATE_NO_WINDOW,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
            else:
                backend_process.terminate()
            
            # 等待最多 5 秒
            backend_process.wait(timeout=5)
            logging.info("Backend process terminated gracefully.")
        except subprocess.TimeoutExpired:
            logging.warning("Backend did not terminate gracefully, killing...")
            backend_process.kill()
            backend_process.wait()
        except Exception as e:
            logging.error(f"Error cleaning up backend: {e}")

def wait_for_backend(port, timeout=120):
    """等待后端服务就绪"""
    start = time.time()
    url = f"http://127.0.0.1:{port}/health"
    attempts = 0
    
    while time.time() - start < timeout:
        attempts += 1
        
        # 检查后端进程是否还活着
        if backend_process and backend_process.poll() is not None:
            logging.error(f"Backend process died unexpectedly with code: {backend_process.returncode}")
            return False
        
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                if response.status == 200:
                    logging.info(f"Backend ready after {attempts} attempts ({time.time() - start:.1f}s)")
                    return True
        except (urllib.error.URLError, ConnectionRefusedError, OSError):
            pass
        
        if attempts % 10 == 0:
            logging.info(f"Waiting for backend... ({attempts} attempts)")
        
        time.sleep(0.5)
    
    logging.error(f"Timeout waiting for backend on port {port}")
    return False

# ============== Windows 主题检测 ==============
def get_windows_theme():
    """检查 Windows 注册表获取主题偏好"""
    if sys.platform != 'win32':
        return 'dark'
    try:
        import winreg
        registry = winreg.ConnectRegistry(None, winreg.HKEY_CURRENT_USER)
        key = winreg.OpenKey(registry, r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize")
        value, _ = winreg.QueryValueEx(key, "AppsUseLightTheme")
        return 'light' if value == 1 else 'dark'
    except Exception:
        return 'dark'

# ============== JS API ==============
import webview

class JSApi:
    def __init__(self):
        self.window = None

    def save_file(self, content, filename):
        """打开原生保存文件对话框"""
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
                mode = 'wb' if isinstance(content, (bytes, bytearray)) else 'w'
                encoding = None if 'b' in mode else 'utf-8'
                with open(result, mode, encoding=encoding) as f:
                    f.write(content)
                return True
        except Exception as e:
            logging.error(f"Error saving file: {e}")
            
        return False

    def trigger_export(self):
        """原生数据导出逻辑"""
        import zipfile
        import tempfile
        import datetime
        
        if not self.window: return {"status": "error", "message": "Window not initialized"}
        
        base_data_dir = os.environ.get("APP_DATA_DIR")
        if not base_data_dir or not os.path.exists(base_data_dir):
            return {"status": "error", "message": "Data directory not found"}

        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        suggested_name = f"InvoMaster_Backup_{timestamp}.zip"
        
        try:
            dest_path = self.window.create_file_dialog(
                webview.SAVE_DIALOG,
                save_filename=suggested_name,
                file_types=('ZIP files (*.zip)', 'All files (*.*)')
            )
            
            if not dest_path: return {"status": "cancelled"}

            with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp:
                tmp_path = tmp.name
            
            with zipfile.ZipFile(tmp_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for root, dirs, files in os.walk(base_data_dir):
                    if any(x in root for x in ['models', 'cache', 'runs']): continue
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, base_data_dir)
                        zipf.write(file_path, arcname)
            
            shutil.move(tmp_path, dest_path)
            logging.info(f"Native export successful: {dest_path}")
            return {"status": "success", "path": dest_path}
            
        except Exception as e:
            logging.error(f"Native export failed: {e}", exc_info=True)
            return {"status": "error", "message": str(e)}

    def trigger_import(self):
        """原生数据导入逻辑"""
        import zipfile
        
        if not self.window: return {"status": "error", "message": "Window not initialized"}
        
        try:
            file_paths = self.window.create_file_dialog(
                webview.OPEN_DIALOG,
                allow_multiple=False,
                file_types=('ZIP files (*.zip)', 'All files (*.*)')
            )
            
            if not file_paths or len(file_paths) == 0: return {"status": "cancelled"}
            src_zip = file_paths[0]

            if not zipfile.is_zipfile(src_zip):
                return {"status": "error", "message": "Selected file is not a valid ZIP archive"}

            base_data_dir = os.environ.get("APP_DATA_DIR")
            
            with zipfile.ZipFile(src_zip, 'r') as zipf:
                if "metadata.db" not in zipf.namelist():
                    return {"status": "error", "message": "Invalid backup: metadata.db missing"}
                
                old_backup = base_data_dir + "_old_before_native_import"
                if os.path.exists(old_backup): shutil.rmtree(old_backup)
                shutil.copytree(base_data_dir, old_backup, ignore=shutil.ignore_patterns('models', 'cache', 'runs'))
                
                zipf.extractall(base_data_dir)
            
            logging.info(f"Native import successful from: {src_zip}")
            return {"status": "success", "message": "Data restored. Please restart app."}
            
        except Exception as e:
            logging.error(f"Native import failed: {e}", exc_info=True)
            return {"status": "error", "message": str(e)}

# ============== 后端模式 ==============
def run_backend_mode(port, host="127.0.0.1"):
    """后端服务模式"""
    setup_logging("backend")
    logging.info("="*50)
    logging.info("Starting in BACKEND mode...")
    logging.info(f"Python: {sys.version}")
    logging.info(f"Platform: {sys.platform}")
    
    # 配置路径
    if getattr(sys, 'frozen', False):
        bundle_root = sys._MEIPASS
        backend_dir = bundle_root
    else:
        bundle_root = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.join(bundle_root, 'backend')

    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    
    # 配置数据目录
    base_path = setup_data_directory()
    
    # 资源引导
    bootstrap_assets(base_path)
    
    # 导入后端应用
    try:
        logging.info("Importing backend 'main' module...")
        from main import app
        logging.info("Backend 'main' module imported successfully.")
    except Exception as e:
        logging.error(f"Error importing backend: {e}", exc_info=True)
        sys.exit(1)
    
    # 挂载前端路由
    from fastapi.staticfiles import StaticFiles
    from starlette.responses import FileResponse
    
    if getattr(sys, 'frozen', False):
        dist_dir = os.path.join(sys._MEIPASS, 'frontend', 'dist')
    else:
        dist_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend', 'dist')
    
    if os.path.exists(dist_dir):
        logging.info(f"Found frontend at {dist_dir}, mounting routes...")
        app.mount("/assets", StaticFiles(directory=os.path.join(dist_dir, "assets")), name="assets")
        
        @app.get("/")
        async def serve_spa_root():
            return FileResponse(os.path.join(dist_dir, "index.html"))

        @app.get("/{full_path:path}")
        async def serve_react_app(full_path: str):
            potential_path = os.path.join(dist_dir, full_path)
            if os.path.isfile(potential_path):
                return FileResponse(potential_path)
            return FileResponse(os.path.join(dist_dir, "index.html"))
    else:
        logging.warning(f"Frontend dist not found at {dist_dir}")
    
    # 启动服务器
    import uvicorn
    import signal
    
    def signal_handler(signum, frame):
        logging.info(f"Received signal {signum}, shutting down...")
        sys.exit(0)
    
    if sys.platform != 'win32':
        signal.signal(signal.SIGTERM, signal_handler)
        signal.signal(signal.SIGINT, signal_handler)
    else:
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGBREAK, signal_handler)
    
    logging.info(f"Starting uvicorn on {host}:{port}...")
    
    config = uvicorn.Config(
        app,
        host=host,
        port=port,
        log_level="info",
        workers=1,
        loop="asyncio"
    )
    server = uvicorn.Server(config)
    
    try:
        server.run()
    except Exception as e:
        logging.error(f"Uvicorn error: {e}", exc_info=True)
        sys.exit(1)

def bootstrap_assets(dest_root):
    """将打包的资源复制到用户数据目录"""
    if not getattr(sys, 'frozen', False):
        return

    bundle_root = sys._MEIPASS
    
    src_assets = os.path.join(bundle_root, 'assets')
    dest_assets = os.path.join(dest_root, 'assets')
    
    if os.path.exists(src_assets):
        logging.info(f"Bootstrapping assets to {dest_assets}...")
        try:
            shutil.copytree(src_assets, dest_assets, dirs_exist_ok=True)
        except Exception as e:
            logging.error(f"Failed to bootstrap assets: {e}")
    
    for d in ["uploads", "templates/auto", "templates/custom", "template_sources", "data/models"]:
        target = os.path.join(dest_root, d)
        if not os.path.exists(target):
            os.makedirs(target)

# ============== 前端模式 ==============
def run_frontend_mode():
    """前端 GUI 模式"""
    setup_logging("frontend")
    logging.info("="*60)
    logging.info("Starting in FRONTEND mode...")
    logging.info(f"Python: {sys.version}")
    logging.info(f"Platform: {sys.platform}")
    logging.info(f"Frozen: {getattr(sys, 'frozen', False)}")
    
    # 注册退出处理
    atexit.register(cleanup_backend)
    
    try:
        # 0. Windows DPI 感知
        if sys.platform == 'win32':
            try:
                import ctypes
                ctypes.windll.shcore.SetProcessDpiAwareness(1)
            except Exception as e:
                logging.warning(f"Failed to set DPI awareness: {e}")
        
        # 1. 检查 UNC 路径警告
        current_exe_path = os.path.abspath(sys.executable if getattr(sys, 'frozen', False) else __file__)
        if sys.platform == 'win32' and current_exe_path.startswith('\\\\'):
            msg = "检测到程序正在网络共享路径（UNC）下运行。这可能导致服务启动失败或极度缓慢。\n\n强烈建议将程序文件夹移动到本地磁盘（如 C: 或 D: 盘）后再运行。"
            logging.warning("Running from UNC path: " + current_exe_path)
            try:
                import ctypes
                ctypes.windll.user32.MessageBoxW(0, msg, "运行环境警告", 0x30)
            except:
                pass
        
        # 2. 配置数据目录
        base_path = setup_data_directory()
        
        # 3. 获取可用端口
        port = get_free_port()
        logging.info(f"Using port: {port}")
        
        # 4. 获取系统主题
        system_theme = get_windows_theme()
        bg_color = '#ffffff' if system_theme == 'light' else '#0f172a'
        
        # 5. 准备初始加载页面
        is_windows = sys.platform == 'win32'
        initial_url = None
        
        if is_windows:
            # Windows: 使用 splash.html 文件
            if getattr(sys, 'frozen', False):
                splash_path = os.path.join(sys._MEIPASS, 'assets', 'splash.html')
            else:
                splash_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets', 'splash.html')
            
            if os.path.exists(splash_path):
                splash_path_url = splash_path.replace("\\", "/")
                initial_url = f'file:///{splash_path_url}'
        
        if not initial_url:
            # macOS/Linux: 使用内联 data-uri HTML 作为加载页面
            loader_html = f'''<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
body {{
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: {bg_color};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}}
.spinner {{
    width: 48px;
    height: 48px;
    border: 4px solid rgba(59, 130, 246, 0.2);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}}
@keyframes spin {{ to {{ transform: rotate(360deg); }} }}
.text {{
    margin-top: 20px;
    font-size: 14px;
    color: {'#94a3b8' if system_theme == 'dark' else '#64748b'};
}}
</style>
</head>
<body>
<div class="spinner"></div>
<div class="text">正在加载应用...</div>
</body>
</html>'''
            import base64
            encoded = base64.b64encode(loader_html.encode('utf-8')).decode('utf-8')
            initial_url = f'data:text/html;base64,{encoded}'
        
        # 6. 创建 JS API
        js_api = JSApi()
        
        # 7. 创建 WebView 窗口
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
        
        # 8. 启动后端子进程
        start_time = time.time()
        
        def start_backend_and_redirect():
            """启动后端并在就绪后跳转"""
            # 启动后端子进程
            backend_proc = start_backend_process(port)
            if not backend_proc:
                logging.error("Failed to start backend process")
                if sys.platform == 'win32':
                    try:
                        import ctypes
                        ctypes.windll.user32.MessageBoxW(0, "后端服务启动失败，请查看日志文件。", "启动失败", 0x10)
                    except: pass
                return
            
            # 等待后端就绪
            if wait_for_backend(port):
                logging.info("Backend is ready.")
                
                if is_windows:
                    # 确保 Splash 页面至少显示指定时间
                    elapsed = time.time() - start_time
                    remaining = SPLASH_DURATION - elapsed
                    if remaining > 0:
                        logging.info(f"Splash screen showing for {remaining:.1f}s more...")
                        time.sleep(remaining)
                    
                    logging.info("Redirecting to main app (Windows)...")
                    
                    # DPI 缩放调整窗口
                    try:
                        dpi_scale = window.evaluate_js('window.devicePixelRatio')
                        if dpi_scale is None: 
                            dpi_scale = 1.0
                        else:
                            dpi_scale = float(dpi_scale)
                        
                        target_w = int(1420 * dpi_scale)
                        target_h = int(820 * dpi_scale)
                        
                        logging.info(f"JS DPI Scale: {dpi_scale} -> Resizing to {target_w}x{target_h}")
                        window.resize(target_w, target_h)
                    except Exception as e:
                        logging.warning(f"Failed to resize with JS DPI scaling: {e}")
                        window.resize(1420, 820)
                    
                    # 加载主应用 URL
                    window.load_url(f'http://127.0.0.1:{port}')
                else:
                    # macOS/Linux: 后端就绪后加载主 URL
                    logging.info("Backend ready, redirecting to main app (macOS/Linux)...")
                    window.load_url(f'http://127.0.0.1:{port}')
            else:
                logging.error("Backend server did not start in time.")
                if sys.platform == 'win32':
                    try:
                        import ctypes
                        ctypes.windll.user32.MessageBoxW(0, "后端服务启动超时，请检查日志或移动到本地磁盘运行。", "启动失败", 0x10)
                    except: pass
        
        # 启动后端监控线程
        monitor_thread = threading.Thread(target=start_backend_and_redirect, daemon=True)
        monitor_thread.start()
        
        # 9. 启动 WebView 主循环
        gui_engine = 'edgechromium' if sys.platform == 'win32' else None
        logging.info(f"Starting webview (gui={gui_engine})...")
        webview.start(gui=gui_engine, debug=False)
        
        logging.info("Webview closed, cleaning up...")
        
    except Exception as e:
        logging.error(f"Application error: {e}", exc_info=True)
        if sys.platform == 'win32':
            try:
                import ctypes
                ctypes.windll.user32.MessageBoxW(0, f"Application Error: {str(e)}", "Fatal Error", 0x10)
            except:
                pass

# ============== 主函数 ==============
def main():
    parser = argparse.ArgumentParser(description='InvoMaster Desktop Application')
    parser.add_argument('--backend', action='store_true', help='Run in backend server mode')
    parser.add_argument('--port', type=int, default=8000, help='Port for backend server')
    parser.add_argument('--host', type=str, default='127.0.0.1', help='Host for backend server')
    
    args = parser.parse_args()
    
    if args.backend:
        # 后端服务模式
        run_backend_mode(args.port, args.host)
    else:
        # 前端 GUI 模式
        run_frontend_mode()

if __name__ == '__main__':
    import multiprocessing
    multiprocessing.freeze_support()
    main()
