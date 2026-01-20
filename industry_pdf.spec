# -*- mode: python ; coding: utf-8 -*-

import sys
import os
from PyInstaller.utils.hooks import copy_metadata

block_cipher = None

# Get absolute path to the project root
project_root = os.path.abspath(os.curdir)

# Define data inclusions with absolute paths
datas = [
    (os.path.join(project_root, 'frontend', 'dist'), 'frontend/dist'),
    (os.path.join(project_root, 'assets'), 'assets'),
    (os.path.join(project_root, 'backend', 'data', 'models'), 'models'),
]

# Add any package metadata if needed (e.g. module versions)
datas += copy_metadata('rapidocr-onnxruntime')

# Explicitly add rapidocr-onnxruntime package data (config.yaml, etc.)
import rapidocr_onnxruntime
rapidocr_path = os.path.dirname(rapidocr_onnxruntime.__file__)
datas.append((rapidocr_path, 'rapidocr_onnxruntime'))

# Icon selection based on platform
icon_file = 'assets/icon.icns' if sys.platform == 'darwin' else 'assets/icon.ico'

a = Analysis(
    ['run_desktop.py'],
    pathex=['backend'],  # Add backend to path for analysis
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
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'PyQt5', 'PySide2', 'matplotlib', 'polars'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

# --- Advanced Optimization: Remove unused torch components ---
def is_needless(entry):
    name = entry[0]
    # Remove torch tests, distributed, headers, and other heavy unused parts
    if 'torch/test' in name or 'torch/testing' in name: return True
    if 'torch/distributed' in name: return True
    if 'torch/include' in name: return True
    if 'torch/share' in name: return True
    if 'caffe2' in name: return True
    # Remove other typical bloat
    if 'pydantic/v1' in name: return True # rapidocr might use v1, careful, but usually safe if v2 is used
    return False

# Filter the TOCs (Table of Contents)
a.binaries = [x for x in a.binaries if not is_needless(x)]
a.datas = [x for x in a.datas if not is_needless(x)]
a.zipfiles = [x for x in a.zipfiles if not is_needless(x)]
# -----------------------------------------------------------

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='票据识别专家',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # GUI application, no console window
    disable_windowed_traceback=False,
    argv_emulation=sys.platform == 'darwin',  # Only for macOS
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=icon_file
)

# Platform specific packaging
if sys.platform == 'darwin':
    app = BUNDLE(
        exe,
        a.binaries,
        a.zipfiles,
        a.datas,
        name='票据识别专家.app',
        icon=icon_file,
        bundle_identifier='com.industrypdf.app'
    )
else:
    # One-Dir mode for Windows/Linux (Recommended for ML apps)
    coll = COLLECT(
        exe,
        a.binaries,
        a.zipfiles,
        a.datas,
        strip=False,
        upx=True,
        upx_exclude=[],
        name='票据识别专家',
    )
