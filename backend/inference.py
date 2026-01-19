import onnxruntime as ort
import numpy as np
from PIL import Image
import os
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
            base_data = os.environ.get("APP_DATA_DIR", "data")
            model_path = os.path.join(base_data, "models", "yolov10-doclayout.onnx")
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"ONNX model not found: {model_path}")
        
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

    def preprocess_image(self, image: Union[str, Image.Image], imgsz: int = 1024):
        """
        预处理图像为 ONNX 模型输入格式
        """
        # 加载图像
        if isinstance(image, str):
            img = Image.open(image).convert('RGB')
        else:
            img = image.convert('RGB')
        
        # 保存原始尺寸
        orig_width, orig_height = img.size
        
        # Resize 到模型输入尺寸 (保持宽高比)
        scale = min(imgsz / orig_width, imgsz / orig_height)
        new_width = int(orig_width * scale)
        new_height = int(orig_height * scale)
        
        img_resized = img.resize((new_width, new_height), Image.BILINEAR)
        
        # Pad 到正方形
        img_padded = Image.new('RGB', (imgsz, imgsz), (114, 114, 114))
        img_padded.paste(img_resized, (0, 0))
        
        # 转换为 numpy 数组并归一化
        img_array = np.array(img_padded).astype(np.float32) / 255.0
        
        # 转换为 CHW 格式
        img_array = img_array.transpose(2, 0, 1)
        
        # 添加 batch 维度
        img_array = np.expand_dims(img_array, axis=0)
        
        return img_array, scale, (orig_width, orig_height), (new_width, new_height)

    def postprocess_outputs(self, outputs, scale, orig_size, resized_size, conf=0.25, iou=0.45, imgsz=1024):
        """
        后处理 ONNX 模型输出
        """
        # YOLOv10 输出格式: [batch, num_boxes, 6] -> [x1, y1, x2, y2, confidence, class]
        predictions = outputs[0][0]  # 取第一个 batch
        resized_w, resized_h = resized_size  # 实际缩放后的图像尺寸
        
        boxes = []
        for pred in predictions:
            x1, y1, x2, y2, confidence, cls_id = pred
            
            # 置信度过滤
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

    def predict(self, image_path, device=None, conf=0.25, imgsz=1024, iou=0.45, agnostic_nms=False):
        """
        预测布局区域
        """
        print(f"Running ONNX prediction (conf={conf}, imgsz={imgsz})")
        
        # 预处理
        input_data, scale, orig_size, resized_size = self.preprocess_image(image_path, imgsz)
        
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
