import onnxruntime as ort
import numpy as np
from PIL import Image
import os
import sys
from typing import List, Dict, Union

# DocLayout-YOLO 类别名称映射
DOCLAYOUT_CLASSES = {
    0: 'title',
    1: 'plain text',
    2: 'abandon',
    3: 'figure',
    4: 'figure_caption',
    5: 'table',
    6: 'table_caption',
    7: 'table_footnote',
    8: 'isolate_formula',
    9: 'formula_caption'
}

def get_device_providers():
    """
    获取可用的 ONNX Runtime 执行提供者
    优先级: CUDA > CoreML (MPS) > CPU
    """
    available = ort.get_available_providers()
    
    if 'CUDAExecutionProvider' in available:
        return ['CUDAExecutionProvider', 'CPUExecutionProvider']
    elif 'CoreMLExecutionProvider' in available:
        return ['CoreMLExecutionProvider', 'CPUExecutionProvider']
    else:
        return ['CPUExecutionProvider']

class LayoutEngine:
    def __init__(self, model_path=None, device=None):
        if model_path is None:
            base_data = os.environ.get("APP_DATA_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "data"))
            is_windows = sys.platform.startswith('win')
            
            # Model filename candidates
            # Reverting back to original FP32 model as INT8 failed on Windows
            model_filenames = ["yolov10-doclayout.onnx"]
            
            candidates = []
            for filename in model_filenames:
                # 1. User Data Directory
                candidates.append(os.path.join(base_data, "models", filename))
                
                # 2. Bundled Resources
                if getattr(sys, 'frozen', False):
                    candidates.append(os.path.join(sys._MEIPASS, "models", filename))
                
                # 3. Development / CWD locations
                candidates.extend([
                    os.path.join("data", "models", filename),
                    os.path.join("models", filename),
                ])
            
            # Find the first existing path
            for path in candidates:
                if os.path.exists(path):
                    model_path = path
                    break
            
            # Fallback for error message if nothing found
            if model_path is None:
                model_path = os.path.join(base_data, "models", "yolov10-doclayout.onnx")
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"MODEL_MISSING: {os.path.basename(model_path)}")
        
        # 确定执行提供者
        if device == 'cuda':
            providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']
        elif device == 'mps':
            providers = ['CoreMLExecutionProvider', 'CPUExecutionProvider']
        else:
            providers = get_device_providers()
        
        print(f"Initializing LayoutEngine with providers: {providers}")
        
        # 加载 ONNX 模型
        sess_options = ort.SessionOptions()
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        
        # CPU 性能优化：根据核心数设置线程
        import multiprocessing
        cpus = multiprocessing.cpu_count()
        
        # 优化策略：
        # 1. 核心数 <= 4: 使用 cpus - 1, 留 1 核给 UI
        # 2. 核心数 > 4: 使用 cpus // 2, 保持系统整体响应
        if cpus <= 4:
            threads = max(1, cpus - 1)
        else:
            threads = cpus // 2
            
        sess_options.intra_op_num_threads = threads
        print(f"CPU threads optimized: {threads} threads for {cpus} cores")
        
        self.session = ort.InferenceSession(
            model_path,
            sess_options=sess_options,
            providers=providers
        )
        
        # 获取模型输入输出信息
        self.input_name = self.session.get_inputs()[0].name
        self.output_names = [output.name for output in self.session.get_outputs()]
        
        print(f"Model loaded successfully. Input: {self.input_name}")
        print(f"Active providers: {self.session.get_providers()}")
        
        
        # 类别名称映射
        self.names = DOCLAYOUT_CLASSES
        
        # Store device info
        self.device = 'cuda' if 'CUDAExecutionProvider' in providers else ('mps' if 'CoreMLExecutionProvider' in providers else 'cpu')

    def enhance_image(self, img: Image.Image) -> Image.Image:
        """
        图像增强策略 B：提升对比度与锐度，使细微线条更清晰
        """
        from PIL import ImageOps, ImageEnhance
        
        # 1. 自动线性对比度拉伸 (忽略 1% 的极值，防止噪点干扰)
        img = ImageOps.autocontrast(img, cutoff=1)
        
        # 2. 增强对比度 (系数 1.5)
        contrast = ImageEnhance.Contrast(img)
        img = contrast.enhance(1.5)
        
        # 3. 增强锐度 (系数 2.0，让表格边框更扎实)
        sharpness = ImageEnhance.Sharpness(img)
        img = sharpness.enhance(2.0)
        
        return img

    def preprocess_image(self, image: Union[str, Image.Image], imgsz: int = 1024, fast_mode: bool = False):
        """
        预处理图像为 ONNX 模型输入格式
        """
        # 加载图像
        if isinstance(image, str):
            img = Image.open(image).convert('RGB')
        else:
            img = image.convert('RGB')
        
        # 应用图像增强策略 (fast_mode 时跳过以提升速度)
        if not fast_mode:
            img = self.enhance_image(img)
        
        # 保存原始尺寸
        orig_width, orig_height = img.size
        
        # Resize 到模型输入尺寸 (强制 1024，因为现有模型不支持动态尺寸或 640)
        # 即使未来支持 640，此处的 imgsz 也应由模型输入决定
        model_h, model_w = self.session.get_inputs()[0].shape[2:]
        imgsz = model_h # Typically 1024
        
        scale = min(imgsz / orig_width, imgsz / orig_height)
        new_width = int(orig_width * scale)
        new_height = int(orig_height * scale)
        
        # 使用更高效的插值方式 (fast_mode 下使用 BILINEAR, 正常模式使用 LANCZOS 提升精度)
        # 注意：PIL.Image.BILINEAR 已经足够快，如果 fast_mode 开启，我们坚持使用它
        resample_mode = Image.BILINEAR if fast_mode else Image.LANCZOS
        img_resized = img.resize((new_width, new_height), resample_mode)
        
        # Pad 到正方形 (114, 114, 114) 是 YOLO 惯用填充色
        img_padded = Image.new('RGB', (imgsz, imgsz), (114, 114, 114))
        img_padded.paste(img_resized, (0, 0))
        
        # 转换为 numpy 数组并归一化
        img_array = np.array(img_padded).astype(np.float32) / 255.0
        
        # 转换为 CHW 格式
        img_array = img_array.transpose(2, 0, 1)
        
        # 添加 batch 维度
        img_array = np.expand_dims(img_array, axis=0)
        
        return img_array, scale, (orig_width, orig_height), (new_width, new_height)

    def postprocess_outputs(self, outputs, scale, orig_size, resized_size, conf=0.25, iou=0.45, imgsz=1280):
        """
        后处理 ONNX 模型输出
        """
        # YOLOv10 输出格式处理
        # 兼容两种格式：
        # 1. 已内置 NMS: [1, 300, 6] -> [x1, y1, x2, y2, confidence, class]
        # 2. 原始输出: [1, 14, 21504] -> [x, y, w, h, class0, ..., class9] (需转置且手动处理)
        
        raw_output = outputs[0]
        if raw_output.shape[1] == 14:
            # 格式 2: 需要转置 [1, 14, 21504] -> [21504, 14]
            predictions = raw_output[0].transpose(1, 0)
            print(f"Detected raw output format: {raw_output.shape}, transposed to {predictions.shape}")
        else:
            predictions = raw_output[0]
            print(f"Detected standard output format: {raw_output.shape}")

        resized_w, resized_h = resized_size
        boxes = []
        
        for pred in predictions:
            if len(pred) == 6:
                # 已经过 NMS 的格式
                x1, y1, x2, y2, confidence, cls_id = pred
            elif len(pred) == 14:
                # 未过 NMS 的原始格式 [x_center, y_center, w, h, score0...score9]
                # 注意：YOLOv10 原始输出每个 anchor 只有一个最高分类别，或者需要我们计算
                # 这里假设前 4 位是 box，后 10 位是类别置信度
                box = pred[:4]
                scores = pred[4:]
                cls_id = np.argmax(scores)
                confidence = scores[cls_id]
                
                if confidence < conf:
                    continue
                
                # xywh 转 x1y1x2y2
                xc, yc, w, h = box
                x1, y1, x2, y2 = xc - w/2, yc - h/2, xc + w/2, yc + h/2
            else:
                continue
            
            # 置信度过滤 (如果上面没过滤)
            if confidence < conf:
                continue
            
            # 使用实际缩放后尺寸归一化（关键修复）
            # YOLO 输出的坐标是相对于 imgsz x imgsz 画布的绝对像素值
            # 但图像只占据画布的 (0,0) 到 (resized_w, resized_h) 区域
            x1_norm = x1 / resized_w
            y1_norm = y1 / resized_h
            x2_norm = x2 / resized_w
            y2_norm = y2 / resized_h
            
            # 裁剪到 [0, 1] 范围
            x1_norm = max(0.0, min(1.0, x1_norm))
            y1_norm = max(0.0, min(1.0, y1_norm))
            x2_norm = max(0.0, min(1.0, x2_norm))
            y2_norm = max(0.0, min(1.0, y2_norm))
            
            w_norm = x2_norm - x1_norm
            h_norm = y2_norm - y1_norm
            
            # === Heuristic Correction for Manufacturing Documents ===
            # 制造业单据优化：
            # 1. 如果识别为"图片" (id=3) 且宽度较大 (>50% 页面宽度)，通常是通栏的表格或表单，强转为 Table
            if int(cls_id) == 3 and w_norm > 0.5:
                 print(f"Heuristic: Converting widespread Figure to Table (w={w_norm:.2f})")
                 cls_id = 5 # Switch to Table
            # 2. 如果识别为"图片" (id=3) 但看起来很有可能是表格，且置信度不高，倾向于认为是表格
            elif int(cls_id) == 3 and confidence < 0.6:
                 # 弱图片检测可能是表格
                 cls_id = 5
            
            boxes.append({
                'x1': float(x1_norm),
                'y1': float(y1_norm),
                'x2': float(x2_norm),
                'y2': float(y2_norm),
                'confidence': float(confidence),
                'class_id': int(cls_id)
            })
        
        # NMS (简化版本，ONNX 模型通常已内置 NMS)
        return boxes

    def predict(self, image_path, device=None, conf=0.25, imgsz=1024, iou=0.45, agnostic_nms=False, fast_mode=False):
        """
        预测布局区域
        """
        if fast_mode:
            print(f"Running ONNX prediction in FAST MODE (conf={conf})")
        else:
            print(f"Running ONNX prediction (conf={conf}, imgsz={imgsz})")
        
        # 预处理 (Use updated imgsz)
        input_data, scale, orig_size, resized_size = self.preprocess_image(image_path, imgsz, fast_mode=fast_mode)
        
        # 推理
        outputs = self.session.run(None, {self.input_name: input_data})
        
        # 后处理
        boxes = self.postprocess_outputs(outputs, scale, orig_size, resized_size, conf, iou, imgsz)
        
        # 转换为项目格式
        regions = []
        for i, box in enumerate(boxes):
            cls_id = box['class_id']
            label = self.names.get(cls_id, f'class_{cls_id}')
            
            regions.append({
                "id": f"auto_{i}",
                "type": label.lower(),
                "x": float(box['x1']),
                "y": float(box['y1']),
                "width": float(box['x2'] - box['x1']),
                "height": float(box['y2'] - box['y1']),
                "label": label
            })
        
        print(f"Detected {len(regions)} regions in {image_path}")
        return regions

# 全局单例
_engine = None

def get_layout_engine():
    global _engine
    if _engine is None:
        _engine = LayoutEngine()
    return _engine
