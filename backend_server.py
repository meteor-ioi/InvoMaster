#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
后端服务独立入口

此脚本作为独立进程运行 FastAPI 后端服务，与前端 pywebview 进程分离。
通过命令行参数接收端口号，支持优雅关闭。
"""

import os
import sys
import signal
import argparse
import logging
import shutil

# ============== 早期日志配置 ==============
def setup_logging():
    """配置日志系统"""
    log_dir = os.path.join(os.path.expanduser('~'), 'IndustryPDF_Logs')
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    log_file = os.path.join(log_dir, 'backend.log')
    
    logging.basicConfig(
        filename=log_file,
        level=logging.INFO,
        format='%(asctime)s - [BACKEND:%(process)d] - %(levelname)s - %(message)s',
        force=True
    )
    
    # 打包环境下重定向标准输出
    if getattr(sys, 'frozen', False):
        sys.stdout = open(os.path.join(log_dir, 'backend_stdout.log'), 'a', encoding='utf-8', buffering=1)
        sys.stderr = open(os.path.join(log_dir, 'backend_stderr.log'), 'a', encoding='utf-8', buffering=1)

setup_logging()
logging.info("="*50)
logging.info("Backend server process starting...")
logging.info(f"Python: {sys.version}")
logging.info(f"Platform: {sys.platform}")
logging.info(f"Frozen: {getattr(sys, 'frozen', False)}")

# ============== 路径配置 ==============
if getattr(sys, 'frozen', False):
    bundle_root = sys._MEIPASS
    backend_dir = bundle_root
else:
    bundle_root = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(bundle_root, 'backend')

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
logging.info(f"Backend dir added to sys.path: {backend_dir}")

# ============== 数据目录配置 ==============
app_name = "IndustryPDF"

if getattr(sys, 'frozen', False):
    app_root = os.path.dirname(sys.executable)
else:
    app_root = os.path.dirname(os.path.abspath(__file__))

# 检查便携模式
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

# ============== 资源引导 ==============
def bootstrap_assets(dest_root):
    """将打包的资源复制到用户数据目录"""
    if not getattr(sys, 'frozen', False):
        return

    bundle_root = sys._MEIPASS
    
    # 1. 资源文件
    src_assets = os.path.join(bundle_root, 'assets')
    dest_assets = os.path.join(dest_root, 'assets')
    
    if os.path.exists(src_assets):
        logging.info(f"Bootstrapping assets to {dest_assets}...")
        try:
            shutil.copytree(src_assets, dest_assets, dirs_exist_ok=True)
        except Exception as e:
            logging.error(f"Failed to bootstrap assets: {e}")
    
    # 2. 创建必要目录结构
    for d in ["uploads", "templates/auto", "templates/custom", "template_sources", "data/models"]:
        target = os.path.join(dest_root, d)
        if not os.path.exists(target):
            os.makedirs(target)

bootstrap_assets(base_path)

# ============== 导入后端应用 ==============
try:
    logging.info("Importing backend 'main' module...")
    from main import app
    logging.info("Backend 'main' module imported successfully.")
except Exception as e:
    logging.error(f"Error importing backend: {e}", exc_info=True)
    sys.exit(1)

# ============== 前端路由挂载 ==============
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

# ============== 服务器运行 ==============
import uvicorn

server = None

def signal_handler(signum, frame):
    """处理关闭信号"""
    logging.info(f"Received signal {signum}, shutting down...")
    if server:
        server.should_exit = True
    sys.exit(0)

def run_server(port: int, host: str = "127.0.0.1"):
    """启动 uvicorn 服务器"""
    global server
    
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
    
    logging.info("Uvicorn server stopped.")

def main():
    parser = argparse.ArgumentParser(description='InvoMaster Backend Server')
    parser.add_argument('--port', type=int, required=True, help='Port to run the server on')
    parser.add_argument('--host', type=str, default='127.0.0.1', help='Host to bind to')
    args = parser.parse_args()
    
    # 注册信号处理器
    if sys.platform != 'win32':
        signal.signal(signal.SIGTERM, signal_handler)
        signal.signal(signal.SIGINT, signal_handler)
    else:
        # Windows 下使用 CTRL_C_EVENT 和 CTRL_BREAK_EVENT
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGBREAK, signal_handler)
    
    logging.info(f"Backend server starting on port {args.port}")
    run_server(args.port, args.host)

if __name__ == '__main__':
    main()
