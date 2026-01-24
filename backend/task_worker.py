"""
API 任务队列后台处理器
负责从 JSONL 文件中读取待处理任务并执行 PDF 提取
"""
import threading
import time
import os
import json
import traceback
from typing import Optional, Dict, Any

class TaskWorker:
    """后台任务处理器"""
    
    def __init__(self, main_module):
        """
        初始化 Worker
        Args:
            main_module: main.py 模块引用，用于调用提取函数
        """
        self.running = False
        self.thread = None
        self.main_module = main_module
        self.poll_interval = 2  # 轮询间隔（秒）
    
    def start(self):
        """启动后台线程"""
        if self.running:
            print("Task worker already running")
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._process_loop, daemon=True)
        self.thread.start()
        print("✓ Task worker started")
    
    def stop(self):
        """停止后台线程"""
        self.running = False
        print("✓ Task worker stopped")
    
    def _process_loop(self):
        """主循环：持续查找并处理待处理任务"""
        while self.running:
            try:
                task = self._get_next_pending_task()
                if task:
                    self._process_task(task)
                else:
                    # 没有待处理任务，休眠
                    time.sleep(self.poll_interval)
            except Exception as e:
                print(f"Task worker error: {e}")
                traceback.print_exc()
                time.sleep(5)  # 出错后等待更长时间再重试
    
    def _get_next_pending_task(self) -> Optional[Dict[str, Any]]:
        """获取下一个待处理任务（按创建时间排序）"""
        tasks = self.main_module.read_all_tasks_raw()
        for task in tasks:
            if task.get('status') == 'pending':
                return task
        return None
    
    def _process_task(self, task: Dict[str, Any]):
        """处理单个任务"""
        task_id = task['id']
        filename = task['filename']
        template_id = task['template_id']
        
        print(f"→ Processing task {task_id}: {filename}")
        
        # 更新状态为 processing
        self.main_module.update_task_status(task_id, 'processing')
        
        try:
            # 执行实际的数据提取
            result = self._extract_data(task)
            
            # 更新状态为 completed
            self.main_module.update_task_status(
                task_id,
                'completed',
                result=result
            )
            print(f"✓ Task {task_id} completed successfully")
            
        except Exception as e:
            # 更新状态为 failed
            error_msg = str(e)
            print(f"✗ Task {task_id} failed: {error_msg}")
            self.main_module.update_task_status(
                task_id,
                'failed',
                error=error_msg
            )
    
    def _extract_data(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """
        执行实际的数据提取
        调用现有的提取逻辑并返回结果
        """
        filename = task['filename']
        template_id = task['template_id']
        
        # 构建文件路径
        file_path = os.path.join(self.main_module.UPLOAD_DIR, filename)
        
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {filename}")
        
        # 调用 extract_with_custom_template 的核心逻辑
        # 这里需要同步调用提取逻辑
        if template_id.lower() == 'auto':
            # 自动识别模式
            result = self._extract_auto_mode(file_path, filename)
        else:
            # 自定义模板模式
            result = self._extract_custom_mode(file_path, filename, template_id)
        
        return result
    
    def _extract_auto_mode(self, file_path: str, filename: str) -> Dict[str, Any]:
        """自动识别模式提取"""
        from utils import pdf_to_images
        
        # 从 main 模块获取 Region 类
        Region = self.main_module.Region
        
        # 计算指纹
        fingerprint = self.main_module.get_file_fingerprint(file_path)
        
        # 转换为图片
        img_subdir = f"images_{fingerprint[:8]}"
        img_save_path = os.path.join(self.main_module.UPLOAD_DIR, img_subdir)
        image_paths = pdf_to_images(file_path, img_save_path)
        
        # 尝试自动匹配模板
        candidates = self.main_module.db.get_all_auto_templates()
        matched_template = None
        matching_regions = []
        
        if candidates:
            match_cand, score = self.main_module.fp_engine.find_best_match(
                file_path, candidates, threshold=0.7
            )
            
            if match_cand:
                # 加载匹配的模板
                t_path = os.path.join(
                    self.main_module.TEMPLATES_AUTO_DIR,
                    f"{match_cand['id']}.json"
                )
                if os.path.exists(t_path):
                    with open(t_path, "r", encoding="utf-8") as f:
                        t_data = json.load(f)
                    regions_objs = [Region(**r) for r in t_data.get("regions", [])]
                    matching_regions = self.main_module.extract_text_from_regions(
                        file_path, regions_objs,
                        image_path=image_paths[0] if image_paths else None,
                        fingerprint=fingerprint
                    )
                    matched_template = match_cand
        
        # 如果没有匹配，使用 AI 识别
        if not matched_template:
            engine = self.main_module.get_layout_engine()
            matching_regions = engine.predict(image_paths[0])
        
        # 构建结果
        # Sort spatially
        matching_regions = self.main_module.sort_regions_spatially(matching_regions)
        result_map = {}
        for r in matching_regions:
            r_dict = r if isinstance(r, dict) else (
                r.to_dict() if hasattr(r, 'to_dict') else vars(r)
            )
            rid = r_dict.get('id', 'unknown')
            result_map[rid] = {
                "type": r_dict.get('type'),
                "label": r_dict.get('label') or rid,
                "remarks": r_dict.get('remarks') or '',
                "content": r_dict.get('content', r_dict.get('text', ''))
            }
        
        return {
            "filename": filename,
            "template_name": matched_template.get('name') if matched_template else "AI识别",
            "mode": "auto",
            "data": result_map
        }
    
    def _extract_custom_mode(self, file_path: str, filename: str, template_id: str) -> Dict[str, Any]:
        """自定义模板模式提取"""
        from utils import pdf_to_images
        
        # 从 main 模块获取 Region 类
        Region = self.main_module.Region
        
        # 获取模板
        t_record = self.main_module.db.get_template(template_id)
        if not t_record:
            raise ValueError(f"Template not found: {template_id}")
        
        mode_dir = (self.main_module.TEMPLATES_AUTO_DIR if t_record['mode'] == 'auto'
                   else self.main_module.TEMPLATES_CUSTOM_DIR)
        t_path = os.path.join(mode_dir, f"{template_id}.json")
        
        if not os.path.exists(t_path):
            raise FileNotFoundError(f"Template file not found: {template_id}")
        
        with open(t_path, "r", encoding="utf-8") as f:
            t_data = json.load(f)
        
        # 生成图片用于 OCR
        fingerprint = self.main_module.get_file_fingerprint(file_path)
        img_subdir = f"images_{fingerprint[:8]}"
        img_save_path = os.path.join(self.main_module.UPLOAD_DIR, img_subdir)
        image_paths = pdf_to_images(file_path, img_save_path)
        
        # 提取数据
        regions_objs = [Region(**r) for r in t_data.get("regions", [])]
        extracted_regions = self.main_module.extract_text_from_regions(
            file_path, regions_objs,
            image_path=image_paths[0] if image_paths else None,
            fingerprint=fingerprint
        )
        
        # 构建结果
        # Sort spatially
        extracted_regions = self.main_module.sort_regions_spatially(extracted_regions)
        result_map = {}
        for r in extracted_regions:
            key = r.get("id")
            meta = {k: v for k, v in r.items()
                   if k not in ["x", "y", "width", "height", "content", "text", "id"]}
            result_map[key] = {
                "content": r.get("content", ""),
                **meta
            }
        
        return {
            "filename": filename,
            "template_name": t_data.get("name", "Unknown"),
            "mode": t_record['mode'],
            "data": result_map
        }
