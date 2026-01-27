import fitz  # PyMuPDF
import os
from PIL import Image
import io
import shutil

# 支持的文件扩展名
SUPPORTED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.webp', '.gif'}
SUPPORTED_PDF_EXTENSIONS = {'.pdf'}
SUPPORTED_EXTENSIONS = SUPPORTED_IMAGE_EXTENSIONS | SUPPORTED_PDF_EXTENSIONS


def is_pdf_file(file_path: str) -> bool:
    """检查文件是否为 PDF 格式"""
    ext = os.path.splitext(file_path)[1].lower()
    return ext in SUPPORTED_PDF_EXTENSIONS


def is_image_file(file_path: str) -> bool:
    """检查文件是否为支持的图片格式"""
    ext = os.path.splitext(file_path)[1].lower()
    return ext in SUPPORTED_IMAGE_EXTENSIONS


def get_file_type(file_path: str) -> str:
    """
    获取文件类型
    返回: 'pdf', 'image', 或 'unknown'
    """
    ext = os.path.splitext(file_path)[1].lower()
    if ext in SUPPORTED_PDF_EXTENSIONS:
        return 'pdf'
    elif ext in SUPPORTED_IMAGE_EXTENSIONS:
        return 'image'
    return 'unknown'


def document_to_images(file_path: str, output_dir: str, dpi=200, target_long_side=4000, max_px=8000) -> list:
    """
    统一的文档转图片函数，支持 PDF 和图片文件输入。
    
    对于 PDF 文件：使用 PyMuPDF 转换为图片
    对于图片文件：直接复制（如需要会进行格式转换为 PNG）
    对于多页 TIFF/GIF：拆分为多张图片
    
    返回生成的图片路径列表
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"文件不存在: {file_path}")
    
    file_type = get_file_type(file_path)
    
    if file_type == 'pdf':
        # PDF 文件使用原有的转换逻辑
        return pdf_to_images(file_path, output_dir, dpi, target_long_side, max_px)
    
    elif file_type == 'image':
        # 图片文件处理
        return image_to_images(file_path, output_dir, target_long_side, max_px)
    
    else:
        raise ValueError(f"不支持的文件格式: {os.path.splitext(file_path)[1]}")


def image_to_images(image_path: str, output_dir: str, target_long_side=4000, max_px=8000) -> list:
    """
    处理图片文件输入，支持多页 TIFF/GIF。
    将图片转换/复制到输出目录，保持与 PDF 处理一致的文件命名格式。
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    image_paths = []
    
    try:
        with Image.open(image_path) as img:
            # 检查是否为多帧图片（如 TIFF 或 GIF）
            n_frames = getattr(img, 'n_frames', 1)
            
            for frame_idx in range(n_frames):
                img_filename = f"page_{frame_idx + 1}.png"
                img_output_path = os.path.join(output_dir, img_filename)
                
                # 如果目标文件已存在且非空，跳过处理
                if os.path.exists(img_output_path) and os.path.getsize(img_output_path) > 0:
                    image_paths.append(img_output_path)
                    continue
                
                # 跳转到对应帧
                if n_frames > 1:
                    img.seek(frame_idx)
                
                # 获取当前帧并转换为 RGB（如果需要）
                frame = img.copy()
                if frame.mode in ('RGBA', 'LA', 'P'):
                    # 带透明通道的图像，先转换为 RGBA 再合成白色背景
                    if frame.mode == 'P':
                        frame = frame.convert('RGBA')
                    background = Image.new('RGB', frame.size, (255, 255, 255))
                    if frame.mode == 'RGBA':
                        background.paste(frame, mask=frame.split()[3])
                    else:
                        background.paste(frame)
                    frame = background
                elif frame.mode != 'RGB':
                    frame = frame.convert('RGB')
                
                # 计算缩放比例（如果图片过大）
                w, h = frame.size
                long_side = max(w, h)
                
                if long_side > max_px:
                    scale = max_px / long_side
                    new_w = int(w * scale)
                    new_h = int(h * scale)
                    frame = frame.resize((new_w, new_h), Image.Resampling.LANCZOS)
                elif long_side < target_long_side and long_side > 0:
                    # 如果图片较小，可以选择放大（可选，这里保持原尺寸）
                    pass
                
                # 保存为 PNG
                frame.save(img_output_path, 'PNG')
                image_paths.append(img_output_path)
                
    except Exception as e:
        raise ValueError(f"处理图片文件失败: {e}")
    
    return image_paths


def pdf_to_images(pdf_path, output_dir, dpi=200, target_long_side=4000, max_px=8000):
    """
    Converts PDF pages to images with adaptive DPI.
    Targeting a specific pixel count for the long side to ensure OCR accuracy
    regardless of physical PDF dimensions (A4 vs A0).
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Fast path: check if images already exist before opening PDF
    # This assumes we want all pages. If we need page count, we must open.
    # However, for performance, we can open once and cache the count if needed, 
    # but here we'll just check if page_1.png exists as a heuristic or better, 
    # open the doc once to get count.
    
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    
    image_paths = []
    all_exist = True
    for i in range(total_pages):
        img_path = os.path.join(output_dir, f"page_{i+1}.png")
        if not os.path.exists(img_path) or os.path.getsize(img_path) == 0:
            all_exist = False
            break
        image_paths.append(img_path)
        
    if all_exist and len(image_paths) == total_pages:
        doc.close()
        # print(f"Using existing images in {output_dir}")
        return image_paths

    # Reset image_paths and do actual conversion
    image_paths = []
    for i in range(total_pages):
        img_filename = f"page_{i+1}.png"
        img_path = os.path.join(output_dir, img_filename)
        
        if os.path.exists(img_path) and os.path.getsize(img_path) > 0:
            image_paths.append(img_path)
            continue
            
        page = doc.load_page(i)
        rect = page.rect
        w_pt, h_pt = rect.width, rect.height
        long_side_pt = max(w_pt, h_pt)
        
        adaptive_dpi = (target_long_side / long_side_pt) * 72
        final_dpi = max(dpi, min(600, adaptive_dpi))
        
        if (long_side_pt * final_dpi / 72) > max_px:
            final_dpi = (max_px / long_side_pt) * 72
            
        matrix = fitz.Matrix(final_dpi / 72, final_dpi / 72)
        pix = page.get_pixmap(matrix=matrix)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        
        img.save(img_path)
        image_paths.append(img_path)
        
    doc.close()
    return image_paths
