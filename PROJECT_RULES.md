# 项目开发规则 (Project Rules)

## UI 文本规范
1. **纯中文原则**：除非必须（如代码、ID、特定术语），UI 上的所有文本内容应优先使用中文，避免中外文混合。
2. **模式命名规范**：
   - 原 `Auto` / `自动` 统一更名为 **“标准模式”**。
   - 原 `Custom` / `自定义` 统一更名为 **“自定义模式”**。


## 核心原则：功能导向与延迟美化

为了确保项目进度与逻辑稳定性，制定以下开发流程规则：

### 1. 优先完成功能逻辑
- 在大版本或具体功能（Feature）的开发过程中，应优先实现业务逻辑、接口对接及交互核心流。
- 严禁在功能逻辑尚未闭环、核心交互未跑通的情况下，频繁进行 UI 细节（如阴影、圆角、1px 级别的边距对齐等）的微调。

### 2. 集中式 UI 调整
- UI 细节的极致优化应推迟到每个大版本（Major Version）或关键里程碑（Milestone）功能完全通过验证后，统一进行“美化阶段”处理。

### 3. Agent 监督职责
- **主动提醒**：如果用户或 Agent 试图在功能开发中途发起非必要的 UI 细节优化，Agent **必须**主动提醒用户，建议先完成功能闭环。
- **确认机制**：在收到 UI 调整要求时，Agent 应根据当前任务进度判断是否属于“美化项”，并向用户确认：“当前功能尚未完整交付，是否仍要现在调整 UI 细节？”

## 數據與穩定性規範
1. **數據一致性 (Data Integrity)**：
   - 當數據分層存儲（如 SQLite 存儲索引，JSON 存儲詳細定義）時，查詢接口**必須**保證數據的完整性。
   - 嚴禁僅返回數據庫索引而忽略磁盤實體文件內容。在 `list_templates` 類接口中，必須執行實體文件與數據庫記錄的內聯合併。
2. **服務狀態感知**：
   - 修改後端邏輯（如 `database.py`）後，**必須**重啟后端服務 (uv run python main.py) 以使變更生效，並通過 `curl` 或交互日誌驗證數據結構。

## UI 交互規範
1. **搜索交互**：
   - 在側邊欄等狹窄空間，搜索框應避免與標題並排擠佔空間。
   - 推薦採用“切換模式”：默認顯示標題與搜索圖標，激活時搜索框替換標題位置，平衡空間利用與視覺優雅。

2. **侧边栏折叠面板 (Collapsible Sidebar)**：
   - **适用场景**：当页面包含控制面板（如筛选、配置）和主内容区域（如预览、结果展示）时，应提供折叠功能以优化空间利用。
   - **折叠按钮位置**：
     - 放置在主内容区域的标题栏**最左侧**，而非控制面板内部
     - 使用 `ChevronLeft`（←）和 `ChevronRight`（→）图标表示折叠/展开状态
     - 按钮样式应使用 `icon-btn` 类，保持与全站图标按钮风格一致
   - **布局实现**：
     ```jsx
     // 使用 CSS Grid 动态调整列宽
     <div style={{ 
       display: 'grid', 
       gridTemplateColumns: isPanelCollapsed ? '0px 1fr' : '300px 1fr',
       gap: '20px',
       transition: 'grid-template-columns 0.3s ease'
     }}>
     ```
   - **面板隐藏逻辑**：
     ```jsx
     // 控制面板样式
     <div style={{
       width: isPanelCollapsed ? '0' : '300px',
       opacity: isPanelCollapsed ? 0 : 1,
       overflow: 'hidden',
       transition: 'width 0.3s ease, opacity 0.3s ease'
     }}>
     ```
   - **动画时长**：统一使用 `0.3s` 过渡时间，确保折叠/展开动作流畅但不拖沓
   - **状态管理**：使用 `useState` 维护折叠状态，命名建议为 `isPanelCollapsed` 或 `isSidebarCollapsed`

## UI 动效规范 (Motion & Animation)
1. **底层选型**：全站动效统一使用 `framer-motion` 库，严禁混用原生 CSS Transition 过多处理复杂布局变换。
2. **布局平移动效 (Layout Transitions)**：
   - 列表项排序、增删、位置交换必须使用 `<motion.div layout>` 属性。
   - 动画效果应追求“丝滑感”，避免机械的位移。
3. **入场与退场 (Presence)**：
   - 使用 `<AnimatePresence mode="popLayout">` 处理元素的物理溢出与占位，确保在元素消失时，周围元素能平滑补位。
   - 默认配置：`initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}`。
4. **交互心智**：
   - 动效应服务于“焦点引导”。例如，点击选择某项时，该项自动平滑置顶。
   - 避免冗余动效，确保动画时长（Duration）在 0.2s - 0.4s 之间，保持响应灵敏。

## 数据提取输出规范 (Data Extraction Output Specification)

### 1. JSON 结构标准
数据提取接口（如 `/extract/{template_id}`）返回的 JSON 必须遵循以下结构：

```json
{
  "status": "success",
  "filename": "样本.pdf",
  "template_name": "识别_样本.pdf",
  "mode": "auto",
  "data": {
    "区域ID": {
      "type": "区域类型",
      "label": "要素分类",
      "remarks": "业务备注",
      "content": "提取内容或二维数组"
    }
  }
}
```

### 2. 字段定义

#### 顶层字段
- **status**: 提取状态，固定为 `"success"` 或错误信息
- **filename**: 上传的原始文件名
- **template_name**: 使用的模板名称
- **mode**: 模板类型，`"auto"` (标准模式) 或 `"custom"` (自定义模式)
- **data**: 核心数据对象，Key 为区域 ID

#### data 对象中的每个区域
- **Key 命名**: 直接使用区域的唯一标识符（如 `auto_0`, `auto_3`），**不使用** Label 作为 Key
- **type**: 区域类型，可选值：`table`, `figure`, `title`, `text`
- **label**: 用户在工作台定义的要素分类（如"表格"、"图片"、"标题"等）
- **remarks**: 业务备注，用户在右侧边栏填写的描述信息，可为 `null`
- **content**: 提取的内容
  - 对于 **表格类型**：存储为二维数组 `[[row1_cell1, row1_cell2], [row2_cell1, row2_cell2]]`
  - 对于 **其他类型**：存储为字符串

#### 排除字段
以下字段**不应**出现在最终的 JSON 输出中：
- `x`, `y`, `width`, `height`（物理坐标信息）
- `text`（已统一为 `content`）
- `id`（已作为 Key 使用，不在值中重复）

### 3. 示例

#### 完整示例
```json
{
  "status": "success",
  "filename": "invoice_2024.pdf",
  "template_name": "标准发票模板",
  "mode": "auto",
  "data": {
    "auto_0": {
      "type": "figure",
      "label": "公司Logo",
      "remarks": null,
      "content": "ABC Corporation"
    },
    "auto_3": {
      "type": "table",
      "label": "费用明细",
      "remarks": "主汇总表",
      "content": [
        ["项目", "数量", "单价", "金额"],
        ["产品A", "10", "100.00", "1000.00"],
        ["产品B", "5", "200.00", "1000.00"]
      ]
    },
    "auto_8": {
      "type": "text",
      "label": "发票号码",
      "remarks": "用于财务系统关联",
      "content": "INV-2024-001234"
    }
  }
}
```

### 4. 前端渲染适配
- **Markdown 预览**：前端需检测 `content` 是否为数组，若是则动态转换为 HTML 表格
- **JSON 导出**：直接序列化 `data` 对象
- **XML 导出**：数组类型需转为 JSON 字符串嵌入 XML 节点

---
*最后更新：2026-01-17*
