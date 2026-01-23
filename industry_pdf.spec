# -*- mode: python ; coding: utf-8 -*-
"""
InvoMaster PyInstaller 打包配置

混合架构：
- Windows: 双 exe 结构 (InvoMaster.exe + backend_server.exe) 以解决卡顿问题。
  - backend_server.exe 不使用自定义图标，使用系统默认。
- macOS: 单 EXE 线程架构 (BUNDLE) 以避免双 Dock 图标问题。
"""

import sys
import os
from PyInstaller.utils.hooks import copy_metadata

block_cipher = None

# Get absolute path to the project root
project_root = os.path.abspath(os.curdir)

# ============== 共享数据 ==============
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

# ============== 共享隐藏导入 ==============
shared_hiddenimports = [
    'uvicorn', 
    'uvicorn.protocols.http.auto_impl',
    'uvicorn.protocols.http.httptools_impl',
    'uvicorn.protocols.websockets.auto_impl',
    'uvicorn.lifespan.on',
    'fastapi', 
    'starlette',
    'pydantic', 
    'multipart',
    'PIL', 
    'cv2', 
    'numpy',
    'onnxruntime',
    'rapidocr_onnxruntime',
    'webview',
]

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

# ============== 前端主程序分析 (InvoMaster) ==============
a_frontend = Analysis(
    ['run_desktop.py'],
    pathex=['backend'],
    binaries=[],
    datas=datas,
    hiddenimports=shared_hiddenimports + ['clr'],  # pythonnet for Windows WebView2
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'PyQt5', 'PySide2', 'matplotlib', 'polars', 'torch', 'networkx', 'jinja2'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

a_frontend.binaries = [x for x in a_frontend.binaries if not is_needless(x)]
a_frontend.datas = [x for x in a_frontend.datas if not is_needless(x)]
a_frontend.zipfiles = [x for x in a_frontend.zipfiles if not is_needless(x)]

pyz_frontend = PYZ(a_frontend.pure, a_frontend.zipped_data, cipher=block_cipher)

exe_frontend = EXE(
    pyz_frontend,
    a_frontend.scripts,
    [],
    exclude_binaries=True,
    name='InvoMaster',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=sys.platform == 'darwin',
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=icon_file
)

# ============== 后端服务分析 (仅 Windows 需要双 exe) ==============
if sys.platform != 'darwin':
    a_backend = Analysis(
        ['backend_server.py'],
        pathex=['backend'],
        binaries=[],
        datas=datas, # 恢复使用统一数据列表，避免文件夹结构冲突
        hiddenimports=shared_hiddenimports,
        hookspath=[],
        hooksconfig={},
        runtime_hooks=[],
        excludes=['tkinter', 'PyQt5', 'PySide2', 'matplotlib', 'polars', 'torch', 'networkx', 'jinja2', 'clr', 'webview'],
        win_no_prefer_redirects=False,
        win_private_assemblies=False,
        cipher=block_cipher,
        noarchive=False,
    )
    
    a_backend.binaries = [x for x in a_backend.binaries if not is_needless(x)]
    a_backend.datas = [x for x in a_backend.datas if not is_needless(x)]
    a_backend.zipfiles = [x for x in a_backend.zipfiles if not is_needless(x)]
    
    pyz_backend = PYZ(a_backend.pure, a_backend.zipped_data, cipher=block_cipher)
    
    exe_backend = EXE(
        pyz_backend,
        a_backend.scripts,
        [],
        exclude_binaries=True,
        name='_invo_backend', # 内部服务名
        debug=False,
        bootloader_ignore_signals=False,
        strip=False,
        upx=True,
        console=False,
        disable_windowed_traceback=False,
        argv_emulation=False,
        target_arch=None,
        codesign_identity=None,
        entitlements_file=None,
        icon='assets/watcher.ico' # 使用新的专属后端图标
    )

# ============== 平台特定打包 ==============
if sys.platform == 'darwin':
    # macOS: 保持单 BUNDLE 架构，内置后端线程逻辑
    app = BUNDLE(
        exe_frontend,
        a_frontend.binaries,
        a_frontend.zipfiles,
        a_frontend.datas,
        name='InvoMaster.app',
        icon=icon_file,
        bundle_identifier='com.industrypdf.app'
    )
else:
    # Windows: 合并资源并收集两个 exe
    merged_binaries = a_frontend.binaries + a_backend.binaries
    merged_datas = a_frontend.datas + a_backend.datas
    merged_zipfiles = a_frontend.zipfiles + a_backend.zipfiles
    
    # 去重
    def get_unique(items):
        seen = set()
        res = []
        for x in items:
            if x[0] not in seen:
                seen.add(x[0])
                res.append(x)
        return res

    coll = COLLECT(
        exe_frontend,
        exe_backend,
        get_unique(merged_binaries),
        get_unique(merged_zipfiles),
        get_unique(merged_datas),
        strip=False,
        upx=True,
        upx_exclude=[],
        name='InvoMaster',
    )
