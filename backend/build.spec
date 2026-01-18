# -*- mode: python ; coding: utf-8 -*-

from PyInstaller.utils.hooks import collect_submodules, collect_data_files
import sys
import os

block_cipher = None

# ------------------------------------------------------------
# 动态库隐式导入配置
# ------------------------------------------------------------
hidden_imports = [
    'uvicorn',
    'fastapi',
    'pdfplumber',
    'sqlite3',
    'doclayout_yolo',
    'ultralytics',
    'rapidocr_onnxruntime',
    'onnxruntime',
    'cv2',
    'PIL',
    'fitz',  # PyMuPDF
    'numpy',
    'scipy.special.cython_special', # 常用于科学计算库
]

# 收集 ultralytics 的子模块，防止 YOLO 缺失
hidden_imports += collect_submodules('ultralytics')

# ------------------------------------------------------------
# 数据文件包含配置
# ------------------------------------------------------------
# 格式: (源路径, 目标路径)
datas = [
    # 模型文件 (需在打包前确保已下载到 backend/data/models)
    ('data/models', 'data/models'),
    # 默认模板和其他静态资源
    ('data/templates', 'data/templates'),
]

# ------------------------------------------------------------
# 主构建流程
# ------------------------------------------------------------
a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='industry_pdf_backend',  # 生成的可执行文件名
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,  # 开启控制台以便调试（生产环境可改为 False）
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
