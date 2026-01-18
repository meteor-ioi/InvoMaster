"""
Industry PDF - 统一配置管理模块

此模块负责：
1. 检测运行环境（开发态 vs 打包态）
2. 提供统一的路径管理（只读资源 vs 可写数据）
3. 支持动态端口配置
"""

import sys
import os
from pathlib import Path
import platform

# ============================================================
# 环境检测
# ============================================================

def is_frozen() -> bool:
    """检测是否为 PyInstaller 打包后的运行环境"""
    return getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS')


def get_platform() -> str:
    """获取当前操作系统平台"""
    system = platform.system().lower()
    if system == 'darwin':
        return 'macos'
    elif system == 'windows':
        return 'windows'
    else:
        return 'linux'


# ============================================================
# 路径管理
# ============================================================

def get_base_dir() -> Path:
    """
    获取应用基础目录
    - 开发环境：项目根目录/backend
    - 打包环境：PyInstaller 解压临时目录
    """
    if is_frozen():
        return Path(sys._MEIPASS)
    else:
        return Path(__file__).parent


def get_user_data_dir() -> Path:
    """
    获取用户数据目录（可写）
    - macOS: ~/Library/Application Support/IndustryPDF
    - Windows: %AppData%/IndustryPDF
    - Linux: ~/.local/share/IndustryPDF
    
    该目录用于存储：上传文件、模板定义、数据库、历史记录等
    """
    if not is_frozen():
        # 开发环境：使用项目内的 data 目录
        return get_base_dir() / "data"
    
    plat = get_platform()
    
    if plat == 'macos':
        base = Path.home() / "Library" / "Application Support"
    elif plat == 'windows':
        base = Path(os.environ.get('APPDATA', Path.home() / 'AppData' / 'Roaming'))
    else:
        base = Path.home() / ".local" / "share"
    
    data_dir = base / "IndustryPDF"
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir


def get_models_dir() -> Path:
    """
    获取模型文件目录（只读）
    - 开发环境：data/models
    - 打包环境：_MEIPASS/data/models
    
    该目录包含：YOLO 布局模型、OCR 模型等
    """
    return get_base_dir() / "data" / "models"


# ============================================================
# 具体路径配置
# ============================================================

# 用户数据目录下的子目录
UPLOAD_DIR = get_user_data_dir() / "uploads"
TEMPLATES_DIR = get_user_data_dir() / "templates"
TEMPLATES_AUTO_DIR = TEMPLATES_DIR / "auto"
TEMPLATES_CUSTOM_DIR = TEMPLATES_DIR / "custom"
TEMPLATES_SOURCE_DIR = get_user_data_dir() / "template_sources"
HISTORY_FILE = get_user_data_dir() / "history.jsonl"
DB_PATH = get_user_data_dir() / "metadata.db"

# 只读资源目录
MODELS_DIR = get_models_dir()
YOLO_MODEL_PATH = MODELS_DIR / "yolov10-doclayout.pt"
OCR_MODELS_DIR = MODELS_DIR / "ocr"

# 确保必要目录存在
def ensure_directories():
    """创建所有必要的目录"""
    dirs = [
        UPLOAD_DIR,
        TEMPLATES_DIR,
        TEMPLATES_AUTO_DIR,
        TEMPLATES_CUSTOM_DIR,
        TEMPLATES_SOURCE_DIR,
    ]
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)


# ============================================================
# 端口配置
# ============================================================

DEFAULT_PORT = 8000
_current_port = DEFAULT_PORT


def get_port() -> int:
    """获取当前配置的端口号"""
    return _current_port


def set_port(port: int):
    """设置端口号（由 Electron 主进程或命令行参数传入）"""
    global _current_port
    _current_port = port


def find_available_port(start_port: int = 8000, max_attempts: int = 100) -> int:
    """
    从指定端口开始，寻找第一个可用的端口
    """
    import socket
    
    for offset in range(max_attempts):
        port = start_port + offset
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('127.0.0.1', port))
                return port
        except OSError:
            continue
    
    raise RuntimeError(f"无法在 {start_port} - {start_port + max_attempts} 范围内找到可用端口")


# ============================================================
# 初始化
# ============================================================

# 模块加载时自动创建目录
ensure_directories()


# ============================================================
# 调试信息
# ============================================================

def print_config_info():
    """打印当前配置信息（用于调试）"""
    print("=" * 50)
    print("Industry PDF 配置信息")
    print("=" * 50)
    print(f"运行环境: {'打包模式' if is_frozen() else '开发模式'}")
    print(f"操作系统: {get_platform()}")
    print(f"基础目录: {get_base_dir()}")
    print(f"用户数据: {get_user_data_dir()}")
    print(f"模型目录: {get_models_dir()}")
    print(f"数据库路径: {DB_PATH}")
    print(f"当前端口: {get_port()}")
    print("=" * 50)


if __name__ == "__main__":
    print_config_info()
