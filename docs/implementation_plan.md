# 版面识别增强方案 (方案 2) 实施计划

本计划旨在实现 DocLayout-YOLO 参数扩展及前端分层控制台 UI（方案 2）。我们将分阶段进行，确保每一步都可验证。

## 待实现功能
- **后端**: 支持 `imgsz`, `iou`, `agnostic_nms` 参数传递。
- **前端**:
    - 实现“识别配置层”：策略切换（极速、平衡、精细）、手动分辨率调整。
    - 实现“视图工具层”：缩放、撤销/重做、类别过滤开关。
    - API 联动：根据配置触发重新识别。

## 实施步骤

### 第一阶段：后端 API 升级
1.  **[MODIFY] [inference.py](file:///Users/icychick/Projects/industry_PDF/backend/inference.py)**:
    - 修改 `predict` 方法，接收 `imgsz`, `iou`, `agnostic_nms` 参数。
2.  **[MODIFY] [main.py](file:///Users/icychick/Projects/industry_PDF/backend/main.py)**:
    - 更新 `/analyze` 接口，接收并传递新的 Pydantic 模型或查询参数。

### 第二阶段：前端状态管理基础
1.  **[MODIFY] [App.jsx](file:///Users/icychick/Projects/industry_PDF/frontend/src/App.jsx)**:
    - 添加 `layoutSettings` 状态（包含 `strategy`, `imgsz`, `iou`, `agnostic_nms`）。
    - 添加 `viewFilters` 状态（用于控制不同类别的显示隐藏）。
    - 更新 `analyze` 函数，将新参数发送给后端。

### 第三阶段：UI 分层重构 (方案 2)
1.  **[MODIFY] [App.jsx](file:///Users/icychick/Projects/industry_PDF/frontend/src/App.jsx)**:
    - 在预览区域上方重构布局，划分为「识别配置」和「视图工具」两个垂直面板。
    - 实现策略预设逻辑：点击“精细”时，自动设置 `imgsz=1600` 和 `conf=0.15`。
2.  **[MODIFY] [index.css](file:///Users/icychick/Projects/industry_PDF/frontend/src/index.css)**:
    - 添加分层控制台相关的样式，优化视觉层次感。

### 第四阶段：功能联动与过滤
1.  **[MODIFY] [DocumentEditor.jsx](file:///Users/icychick/Projects/industry_PDF/frontend/src/components/DocumentEditor.jsx)**:
    - 接收 `viewFilters` 属性。
    - 根据过滤条件动态控制 SVG `g` 元素的渲染。

## 验证计划
- **后端验证**: 使用 Postman 或脚本调用 `/analyze` 接口，确认不同 `imgsz` 下返回结果的差异。
- **前端验证**:
    - 切换“精细模式”，确认页面显示“正在识别...”且返回更多细小目标。
    - 勾选“只看表格”，确认画布上其他类型的框消失。
