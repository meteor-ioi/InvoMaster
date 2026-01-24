# 高精度表格微调：策略组合与手动模式机制说明

本文档详细说明了在 Industry PDF 项目中，高精度表格提取功能的底层策略组合逻辑，特别是关于 `pdfplumber` 的“Manual Mode”（手动模式/Explicit Strategy）与其他自动策略（Lines、Text、Rects）的组合使用机制。

## 1. 核心概念

在表格识别中，我们使用 `pdfplumber` 库作为核心引擎。该库提供了多种策略来识别表格的行（horizontal）和列（vertical）。

### 1.1 常用策略
- **Lines (基于线条)**: 依靠 PDF 中绘制的线条对象来确定边界。
- **Text (基于文字)**: 依靠文字的对齐空隙（gaps）来推断行列边界。
- **Rects (基于色块)**: 依靠矩形色块边缘来确定边界。
- **Explicit (手动模式)**: 完全依赖用户提供的具体的 x/y 坐标列表来切割表格。

## 2. 策略组合机制

`pdfplumber` 的设计允许策略的**排他性（Exclusive）**与**叠加性（Additive）**并在。理解这一点对于解决“无法组合”的问题至关重要。

### 2.1 叠加模式 (Additive)
当 `vertical_strategy` 设置为 `"text"` 或 `"lines"` 等自动策略时，如果同时传入了 `explicit_vertical_lines` 参数：
- **行为**：系统会**先**执行自动识别，**然后**将 `explicit_vertical_lines` 中的线条**追加**到识别结果中。
- **结果**：`最终线条 = 自动识别线条 U 手动指定线条`。
- **应用场景**：补全自动识别遗漏的某一根线。

### 2.2 接管模式 (Exclusive) - 即“手动模式”
当 `vertical_strategy` 直接设置为 `"explicit"` 时：
- **行为**：系统**完全跳过**任何自动识别逻辑，**仅**使用 `explicit_vertical_lines` 参数中提供的线条。
- **结果**：`最终线条 = 手动指定线条`。
- **风险**：如果切换到此模式时没有传入线条数据，系统将认为表格没有列，导致分析失败或报错（`ValueError: explicit_vertical_lines must be specified...`）。

## 3. 组合问题的解决方案

在前端交互中，用户往往希望：“先让 AI 自动算一遍，不对的地方我再手动改”。这就要求我们实现一种“伪组合”：

### 3.1 逻辑桥接
为了在“手动模式”下继承自动识别的成果，我们在前端（`TemplateCreator.jsx`）实现了如下逻辑：

1.  **快照继承**：当用户将策略下拉框从“基于文字”切换到“手动模式”时。
2.  **状态注入**：立即读取当前界面上已渲染的、由算法计算出的行/列坐标。
3.  **参数构造**：将这组坐标作为 initial value 填入 `explicit_vertical_lines` / `explicit_horizontal_lines`。

### 3.2 最终效果
通过这种方式，用户感知的流程是连贯的：
1. 选用 `Text` 策略 -> 得到 80% 准确的表格。
2. 切换 `Explicit` 策略 -> 线条保持不变（因为如果不注入，线条会消失）。
3. 用户手动拖拽/增删 -> 得到 100% 完美的表格。

这种设计既保留了 `pdfplumber` 底层的高效性，又满足了用户层面的灵活组合需求。

## 4. 后端鲁棒性增强 (Robustness)

针对 `explicit` 模式可能出现的空数据问题，后端已做如下防护：
- 当策略为 `explicit` 但传入的线条数量不足（<2条，无法构成单元格）时，后端会自动注入 Region 的边界（Bounding Box 的 start/end）作为兜底，防止服务崩溃。

## 5. 参考资料
- [pdfplumber Official Documentation](https://github.com/jsvine/pdfplumber)
- [Table Extraction Strategies](https://github.com/jsvine/pdfplumber#table-extraction-options)
