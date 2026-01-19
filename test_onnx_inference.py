#!/usr/bin/env python3
"""
测试 ONNX 推理引擎
"""
import sys
import os

# 添加 backend 到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# 设置数据目录
os.environ['APP_DATA_DIR'] = os.path.join(os.path.dirname(__file__), 'backend', 'data')

from inference import get_layout_engine
import glob

def test_onnx_inference():
    print("=" * 60)
    print("测试 ONNX 推理引擎")
    print("=" * 60)
    
    # 初始化引擎
    try:
        engine = get_layout_engine()
        print("✓ ONNX 引擎初始化成功")
    except Exception as e:
        print(f"✗ 引擎初始化失败: {e}")
        return False
    
    # 查找测试 PDF
    test_pdfs = glob.glob("test_docs/*.pdf")
    if not test_pdfs:
        print("✗ 未找到测试 PDF 文件")
        return False
    
    test_pdf = test_pdfs[0]
    print(f"\n使用测试文件: {test_pdf}")
    
    # 转换为图像
    from utils import pdf_to_images
    import tempfile
    
    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            image_paths = pdf_to_images(test_pdf, temp_dir, dpi=200)
            print(f"✓ PDF 转图像成功，共 {len(image_paths)} 页")
        except Exception as e:
            print(f"✗ PDF 转换失败: {e}")
            return False
        
        # 测试推理
        if image_paths:
            try:
                regions = engine.predict(image_paths[0], conf=0.25, imgsz=1024)
                print(f"✓ 推理成功，检测到 {len(regions)} 个区域")
                
                # 显示前 3 个区域
                for i, region in enumerate(regions[:3]):
                    print(f"  区域 {i+1}: {region['label']} (置信度不可见，但已检测)")
                
                if len(regions) > 3:
                    print(f"  ... 还有 {len(regions) - 3} 个区域")
                    
                return True
            except Exception as e:
                print(f"✗ 推理失败: {e}")
                import traceback
                traceback.print_exc()
                return False
    
    return False

if __name__ == "__main__":
    success = test_onnx_inference()
    sys.exit(0 if success else 1)
