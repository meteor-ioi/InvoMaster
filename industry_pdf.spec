# -*- mode: python ; coding: utf-8 -*-
"""
InvoMaster PyInstaller 打包配置

单 exe 双模式架构：
- 默认运行前端 GUI (pywebview)
- --backend 参数运行后端服务 (uvicorn + FastAPI)

主进程会 spawn 自己作为后端子进程，无需两个 exe 文件。
"""

import sys
import os
from PyInstaller.utils.hooks import copy_metadata

block_cipher = None

# Get absolute path to the project root
project_root = os.path.abspath(os.curdir)

# ============== 数据文件 ==============
datas = [
    (os.path.join(project_root, 'frontend', 'dist'), 'frontend/dist'),
    (os.path.join(project_root, 'assets'), 'assets'),
    (os.path.join(project_root, 'backend', 'data', 'models'), 'models'),
]

# Add any package metadata if needed
datas += copy_metadata('rapidocr-onnxruntime')

# Explicitly add rapidocr-onnxruntime package data
import rapidocr_onnxruntime
rapidocr_path = os.path.dirname(rapidocr_onnxruntime.__file__)
datas.append((rapidocr_path, 'rapidocr_onnxruntime'))

# Icon selection based on platform
icon_file = 'assets/icon.icns' if sys.platform == 'darwin' else 'assets/icon.ico'

# ============== 分析 ==============
a = Analysis(
    ['run_desktop.py'],
    pathex=['backend'],
    binaries=[],
    datas=datas,
    hiddenimports=[
        'uvicorn', 
        'fastapi', 
        'starlette',
        'pydantic', 
        'python-multipart',
        'PIL', 
        'cv2', 
        'numpy',
        'onnxruntime',
        'rapidocr_onnxruntime',
        'clr',      # pythonnet for Windows WebView2
        'webview',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'PyQt5', 'PySide2', 'matplotlib', 'polars', 'torch', 'networkx', 'jinja2'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

# ============== 优化过滤器 ==============
def is_needless(entry):
    """过滤不需要的大型依赖"""
    name = entry[0]
    if 'torch/test' in name or 'torch/testing' in name: return True
    if 'torch/distributed' in name: return True
    if 'torch/include' in name: return True
    if 'torch/share' in name: return True
    if 'caffe2' in name: return True
    if 'pydantic/v1' in name: return True
    return False

# 过滤 TOCs
a.binaries = [x for x in a.binaries if not is_needless(x)]
a.datas = [x for x in a.datas if not is_needless(x)]
a.zipfiles = [x for x in a.zipfiles if not is_needless(x)]

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='InvoMaster',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # GUI application, no console window
    disable_windowed_traceback=False,
    argv_emulation=sys.platform == 'darwin',
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=icon_file
)

# ============== 平台特定打包 ==============
if sys.platform == 'darwin':
    app = BUNDLE(
        exe,
        a.binaries,
        a.zipfiles,
        a.datas,
        name='InvoMaster.app',
        icon=icon_file,
        bundle_identifier='com.industrypdf.app'
    )
else:
    # Windows/Linux: One-Dir 模式
    coll = COLLECT(
        exe,
        a.binaries,
        a.zipfiles,
        a.datas,
        strip=False,
        upx=True,
        upx_exclude=[],
        name='InvoMaster',
    )
