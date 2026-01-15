# 项目开发任务进度 (Task Tracking)

## 已完成功能 (Completed)
- [x] **后端基础架构**: FastAPI 核心、CORS 配置、静态文件挂载。
- [x] **版面分析引擎**: 集成 DocLayout-YOLO，支持 `imgsz`, `iou`, `agnostic_nms` 动态参数。
- [x] **模板管理系统**: 模板保存 (`/templates` POST)、模板列表获取 (`/templates` GET)、指纹匹配。
- [x] **数据提取逻辑**: 基于 pdfplumber 的区域文字提取及表格微调算法优化。
- [x] **表格微调优化 (方案 2)**:
    - [x] 增加吸附容差滑块、保存规则按钮。
    - [x] 优化交互热区、添加顶部 Toast 提示。
    - [x] 修复持久化同步 Bug 及保存流程逻辑。
- [x] **前端组件化重构**: 拆分 `TopToolbar`, `LeftPanel`, `RightSidebar`, `DataPreview`，精简 `App.jsx`。
- [x] **模板引用与执行 (New)**: 
    - [x] 实现 `TemplateReference` 视图。
    - [x] 支持自动匹配与显式选择模板。
    - [x] 实现 API 调用示例弹窗 (`ApiExampleModal`)。
    - [x] 添加历史执行记录。

## 待办事项 (To-Do)
- [ ] **多页 PDF 支持增强**: 当前主要针对单页样张，需扩展至多页批量处理。
- [ ] **复杂表格 Ocr 集成**: 对于纯图片类表格，集成 PaddleOCR 或 Tesseract 以提升识别率。
- [ ] **部署优化**: 编写 Dockerfile 及一键启动脚本。
- [ ] **性能监控**: 添加推理耗时及显存占用监控。

## 当前状态
- **版本**: v0.2.0 (Enhanced Layout & Reference)
- **最后更新**: 2026-01-15 12:15
