import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { CheckCircle, ChevronLeft, Sun, Moon, Grid, Upload, Hash, Zap } from 'lucide-react';
import DocumentEditor, { TYPE_CONFIG } from './DocumentEditor';
import TopToolbar from './TopToolbar';
import LeftPanel from './LeftPanel';
import RightSidebar from './RightSidebar';
import DataPreview from './DataPreview';
import { API_BASE } from '../config';

export default function TemplateCreator({ theme, setTheme, device, headerCollapsed = false }) {
    const [file, setFile] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState('review'); // Default to review mode directly

    const DEFAULT_TABLE_SETTINGS = {
        vertical_strategy: 'text',
        horizontal_strategy: 'text',
        snap_tolerance: 6,
        join_tolerance: 3,
    };
    const [templates, setTemplates] = useState([]);
    const [templateName, setTemplateName] = useState('');

    const [editorMode, setEditorMode] = useState('view');
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [toast, setToast] = useState(null);
    const [emptyDragActive, setEmptyDragActive] = useState(false);
    const [templateMode, setTemplateMode] = useState('auto'); // 'auto' or 'custom'

    // --- 版面识别增强状态 ---
    const [layoutSettings, setLayoutSettings] = useState({
        dedup: 'off', // 'off', 'moderate', 'aggressive'
        imgsz: 1024, // Fixed for ONNX model
        iou: 0.45,
        agnostic_nms: false
    });
    const [viewFilters, setViewFilters] = useState({});

    // --- 智能去重：合并重叠区块 ---
    const mergeOverlappingRegions = (regionsToMerge, mode) => {
        if (mode === 'off' || !regionsToMerge || regionsToMerge.length === 0) {
            return regionsToMerge;
        }

        // IoU 阈值：适中=0.5, 激进=0.3
        const iouThreshold = mode === 'aggressive' ? 0.3 : 0.5;

        const calculateIoU = (a, b) => {
            const x1 = Math.max(a.x, b.x);
            const y1 = Math.max(a.y, b.y);
            const x2 = Math.min(a.x + a.width, b.x + b.width);
            const y2 = Math.min(a.y + a.height, b.y + b.height);

            if (x2 <= x1 || y2 <= y1) return 0;

            const intersection = (x2 - x1) * (y2 - y1);
            const areaA = a.width * a.height;
            const areaB = b.width * b.height;
            const union = areaA + areaB - intersection;

            return intersection / union;
        };

        const merged = [];
        const used = new Set();

        for (let i = 0; i < regionsToMerge.length; i++) {
            if (used.has(i)) continue;

            let current = { ...regionsToMerge[i] };
            used.add(i);

            // 查找所有与当前区块重叠的同类型区块
            for (let j = i + 1; j < regionsToMerge.length; j++) {
                if (used.has(j)) continue;
                const other = regionsToMerge[j];

                // 只合并同类型区块
                if (current.type !== other.type) continue;

                const iou = calculateIoU(current, other);
                if (iou >= iouThreshold) {
                    // 合并：取更大的边界框
                    const newX = Math.min(current.x, other.x);
                    const newY = Math.min(current.y, other.y);
                    const newX2 = Math.max(current.x + current.width, other.x + other.width);
                    const newY2 = Math.max(current.y + current.height, other.y + other.height);

                    current = {
                        ...current,
                        x: newX,
                        y: newY,
                        width: newX2 - newX,
                        height: newY2 - newY
                    };
                    used.add(j);
                }
            }

            merged.push(current);
        }

        console.log(`智能去重: ${regionsToMerge.length} -> ${merged.length} 区块 (${mode})`);
        return merged;
    };

    // --- 表格深度编辑状态 ---
    const [tableRefining, setTableRefining] = useState(null);
    const [tableSettings, setTableSettings] = useState({
        vertical_strategy: 'text',
        horizontal_strategy: 'text',
        snap_tolerance: 6,
        join_tolerance: 3,
    });

    const [regions, setRegions] = useState([]);
    const [history, setHistory] = useState([[]]);
    const [historyIndex, setHistoryIndex] = useState(0);

    // --- 表格微调历史 ---
    const [tableHistory, setTableHistory] = useState([]);
    const [tableHistoryIndex, setTableHistoryIndex] = useState(-1);

    const recordTableHistory = (newTableRefining) => {
        if (!newTableRefining) return;
        const newHistory = tableHistory.slice(0, tableHistoryIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(newTableRefining)));
        if (newHistory.length > 50) newHistory.shift();
        setTableHistory(newHistory);
        setTableHistoryIndex(newHistory.length - 1);
    };

    const tableUndo = () => {
        if (tableHistoryIndex > 0) {
            const nextIndex = tableHistoryIndex - 1;
            setTableHistoryIndex(nextIndex);
            setTableRefining(JSON.parse(JSON.stringify(tableHistory[nextIndex])));
        }
    };

    const tableRedo = () => {
        if (tableHistoryIndex < tableHistory.length - 1) {
            const nextIndex = tableHistoryIndex + 1;
            setTableHistoryIndex(nextIndex);
            setTableRefining(JSON.parse(JSON.stringify(tableHistory[nextIndex])));
        }
    };

    const recordHistory = (newRegions) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(newRegions)));
        if (newHistory.length > 50) newHistory.shift();
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const undo = () => {
        if (historyIndex > 0) {
            const nextIndex = historyIndex - 1;
            setHistoryIndex(nextIndex);
            setRegions(JSON.parse(JSON.stringify(history[nextIndex])));
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            const nextIndex = historyIndex + 1;
            setHistoryIndex(nextIndex);
            setRegions(JSON.parse(JSON.stringify(history[nextIndex])));
        }
    };

    const [selectedId, setSelectedId] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]); // Multiple selection support
    const [confidence, setConfidence] = useState(0.25);
    const [zoom, setZoom] = useState(1.0);
    const [showRegions, setShowRegions] = useState(true);
    const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
    const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
    const [lastDeviceUsed, setLastDeviceUsed] = useState(null);
    const [inferenceTime, setInferenceTime] = useState(0);
    const [showSplitPreview, setShowSplitPreview] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [splitPercent, setSplitPercent] = useState(50);
    const [isResizingSplit, setIsResizingSplit] = useState(false);
    const [leftPanelHistoryState, setLeftPanelHistoryState] = useState(null);

    // --- 在版面分析模式下触发数据提取 ---
    useEffect(() => {
        if (showSplitPreview && !tableRefining && (selectedId || selectedIds.length > 0)) {
            handleExtractRegionsData();
        }
    }, [showSplitPreview, selectedId, selectedIds, tableRefining]);

    // --- 自动联动：进入/退出表格微调时自动收起数据预览及侧边栏 ---
    // --- 自动联动：进入/退出表格微调时自动收起数据预览及侧边栏 ---
    const isRefining = !!tableRefining;
    const wasRefiningRef = useRef(isRefining);

    useEffect(() => {
        const wasRefining = wasRefiningRef.current;

        // 仅在状态变更（进入或退出）时触发联动，微调过程中的数据更新不触发
        if (isRefining && !wasRefining) {
            // 进入微调模式：记录当前状态并强制收起
            setShowSplitPreview(false);
            setLeftPanelHistoryState(leftPanelCollapsed);
            setLeftPanelCollapsed(true);
        } else if (!isRefining && wasRefining) {
            // 退出微调模式：恢复之前的状态
            setShowSplitPreview(false);
            if (leftPanelHistoryState !== null) {
                setLeftPanelCollapsed(leftPanelHistoryState);
                setLeftPanelHistoryState(null);
            }
        }

        wasRefiningRef.current = isRefining;
    }, [isRefining, setShowSplitPreview, setLeftPanelHistoryState, setLeftPanelCollapsed]); // 依赖项调整为通过 isRefining 派生

    const lastShowPreview = useRef(showSplitPreview);
    // --- 数据预览自动缩放控制 ---
    useEffect(() => {
        if (showSplitPreview === lastShowPreview.current) return;

        if (showSplitPreview) {
            // 开启预览时，放大 2 倍以补偿缩小的编辑区
            setZoom(prev => prev * 2);
        } else {
            // 关闭预览时，缩小一半恢复原状
            setZoom(prev => prev / 2);
        }
        lastShowPreview.current = showSplitPreview;
    }, [showSplitPreview]);

    const handleExtractRegionsData = async () => {
        if (!analysis || !showSplitPreview) return;

        const targetIds = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []);
        if (targetIds.length === 0) return;

        // 仅提取尚未获取内容或位置发生变动的要素（简化逻辑：每次开启或切换选中时刷新）
        const targetRegions = regions.filter(r => targetIds.includes(r.id));

        setPreviewLoading(true);
        try {
            const formData = new FormData();
            formData.append('filename', analysis.filename);
            formData.append('regions', JSON.stringify(targetRegions));

            const res = await axios.post(`${API_BASE}/regions/extract`, formData);

            // 更新 regions 状态中的 content 字段
            setRegions(prev => prev.map(r => {
                const updated = res.data.find(ur => ur.id === r.id);
                return updated ? { ...r, ...updated } : r;
            }));
        } catch (err) {
            console.error('批量提取要素数据失败', err);
        } finally {
            setPreviewLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();

        const handleToggleSidebars = (e) => {
            const { collapsed } = e.detail;
            setLeftPanelCollapsed(collapsed);
            setRightPanelCollapsed(collapsed);
        };

        window.addEventListener('toggle-sidebars', handleToggleSidebars);
        return () => window.removeEventListener('toggle-sidebars', handleToggleSidebars);
    }, []);

    // 响应式布局：窗口缩小时自动折叠面板
    useEffect(() => {
        const CENTER_MIN_WIDTH = 740;
        const LEFT_EXPANDED = 300;
        const LEFT_COLLAPSED = 64;
        const RIGHT_EXPANDED = 300;
        const RIGHT_COLLAPSED = 64;
        const GAP = 20 * 2; // grid gap
        const PADDING = 20 * 2; // container padding

        const handleResize = () => {
            const viewportWidth = window.innerWidth;
            const availableWidth = viewportWidth - PADDING - GAP;

            // 计算各种布局所需的最小宽度
            const fullExpanded = LEFT_EXPANDED + CENTER_MIN_WIDTH + RIGHT_EXPANDED;
            const leftCollapsed = LEFT_COLLAPSED + CENTER_MIN_WIDTH + RIGHT_EXPANDED;
            const bothCollapsed = LEFT_COLLAPSED + CENTER_MIN_WIDTH + RIGHT_COLLAPSED;

            if (availableWidth >= fullExpanded) {
                // 空间充足，全部展开
                setLeftPanelCollapsed(false);
                setRightPanelCollapsed(false);
            } else if (availableWidth >= leftCollapsed) {
                // 空间不足，先折叠左侧
                setLeftPanelCollapsed(true);
                setRightPanelCollapsed(false);
            } else if (availableWidth >= bothCollapsed) {
                // 空间更小，两侧都折叠
                setLeftPanelCollapsed(true);
                setRightPanelCollapsed(true);
            }
            // 如果空间进一步不足，保持两侧折叠，CSS min-width 会触发滚动条
        };

        // 初始检查
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchTemplates = async () => {
        try {
            const res = await axios.get(`${API_BASE}/templates`);
            setTemplates(res.data);
        } catch (err) {
            console.error('获取模板列表失败', err);
        }
    };

    // --- 拖拽处理 ---
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setEmptyDragActive(true);
        } else if (e.type === "dragleave") {
            setEmptyDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setEmptyDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            analyze(e.dataTransfer.files[0]);
        }
    };

    const analyze = async (targetFile, forceParams = {}) => {
        const currentFile = targetFile || file;
        const currentFilename = analysis?.filename;

        // 如果既没有文件对象，也没有已知的文件名（用于重试），则无法分析
        if (!currentFile && !currentFilename) return;

        setLoading(true);
        const formData = new FormData();

        if (currentFile) {
            formData.append('file', currentFile);
            if (targetFile) setFile(targetFile);
        } else if (currentFilename) {
            formData.append('filename', currentFilename);
        }

        try {
            const currentConf = forceParams.conf !== undefined ? forceParams.conf : confidence;
            const isRefresh = forceParams.refresh || false;
            const res = await axios.post(`${API_BASE}/analyze`, formData, {
                params: {
                    device: device,
                    conf: currentConf,
                    imgsz: layoutSettings.imgsz,
                    iou: layoutSettings.iou,
                    agnostic_nms: layoutSettings.agnostic_nms,
                    refresh: isRefresh,
                    skip_history: true  // 模板制作不记录历史
                }
            });
            setAnalysis(res.data);
            if (res.data.device_used) setLastDeviceUsed(res.data.device_used);
            if (res.data.inference_time) setInferenceTime(res.data.inference_time);
            const mappedRegions = (res.data.regions || []).map(r => ({
                ...r,
                label: TYPE_CONFIG[r.type.toLowerCase()]?.label || r.label
            }));
            // 应用智能去重
            const finalRegions = mergeOverlappingRegions(mappedRegions, layoutSettings.dedup);
            setRegions(finalRegions);
            setTemplateName(res.data.template_found ? (res.data.matched_template?.name || `识别_${res.data.filename}`) : `模型_${res.data.filename}`);
            // If template found, use its mode, otherwise default to auto
            setTemplateMode(res.data.matched_template?.mode || 'auto');
            setStep('review');
            setEditorMode('view');
            setTableRefining(null);
        } catch (err) {
            console.error(err);
            alert('识别失败，请检查后端服务状态');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectTemplate = async (template) => {
        // 1. Proactively set layout if available in the template list
        if (template.regions) {
            const mappedRegions = template.regions.map(r => ({
                ...r,
                label: TYPE_CONFIG[r.type.toLowerCase()]?.label || r.label
            }));
            setRegions(mappedRegions);
        }
        setTemplateName(template.name);
        setAnalysis(null); // Clear previous analysis but keep regions for layout preview
        setStep('review');
        setEditorMode('view');

        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/templates/${template.id}/analyze`);
            setAnalysis(res.data);
            const mappedRegions = (res.data.regions || []).map(r => ({
                ...r,
                label: TYPE_CONFIG[r.type.toLowerCase()]?.label || r.label
            }));
            setRegions(mappedRegions);
            setFile(null); // Clear local file as we are using server source
            setTableRefining(null);
        } catch (err) {
            console.error('从源文件库加载失败', err);
            alert('加载模板源文件失败，可能是源文件已被移除');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTemplate = async (id) => {
        if (!window.confirm('确定要删除该模板吗？此操作不可撤销且将清理物理文件。')) return;
        try {
            await axios.delete(`${API_BASE}/templates/${id}`);
            fetchTemplates();
            if (analysis && analysis.id === id) {
                setAnalysis(null);
                setRegions([]);
            }
            setToast({ type: 'success', text: '模板已从数据库及磁盘中删除' });
            setTimeout(() => setToast(null), 2000);
        } catch (err) {
            console.error('删除模板失败', err);
            alert('删除失败: ' + (err.response?.data?.detail || err.message));
        }
    };


    const handleEnterTableRefine = async (region, settingsOverride = null) => {
        setLoading(true);

        // 确定最终使用的设置：优先级 override > 已保存的设置 > 默认设置
        let s;
        if (settingsOverride) {
            s = settingsOverride;
        } else if (region.table_settings) {
            s = region.table_settings;
            // 同步到 UI 状态，以便侧边栏显示正确
            setTableSettings(region.table_settings);
        } else {
            s = DEFAULT_TABLE_SETTINGS;
            // 关键修复：如果没有保存过设置，则重置 UI 状态为默认，防止继承上一个表格的残留
            setTableSettings(DEFAULT_TABLE_SETTINGS);
        }

        try {
            const res = await axios.post(`${API_BASE}/table/analyze`, {
                id: analysis.id,
                filename: analysis.filename,
                region_id: region.id,
                x: region.x,
                y: region.y,
                width: region.width,
                height: region.height,
                settings: s
            });


            if (res.data.snapped_bbox) {
                setRegions(prev => prev.map(r => r.id === region.id ? {
                    ...r,
                    ...res.data.snapped_bbox
                } : r));
            }

            const newState = {
                id: region.id,
                filename: analysis.filename,
                rows: res.data.rows,
                cols: res.data.cols,
                cells: res.data.cells,
                preview: res.data.preview,
                settings: s
            };

            setTableRefining(newState);
            // 初始化表格历史
            setTableHistory([JSON.parse(JSON.stringify(newState))]);
            setTableHistoryIndex(0);
        } catch (err) {
            console.error(err);
            alert('获取表格结构分析失败');
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyzeTable = async (regionId, newSettings) => {
        const region = regions.find(r => r.id === regionId);
        if (!region || !analysis) return;

        try {
            const res = await axios.post(`${API_BASE}/table/analyze`, {
                id: analysis.id,
                filename: analysis.filename,
                region_id: region.id,
                x: region.x,
                y: region.y,
                width: region.width,
                height: region.height,
                settings: newSettings
            });

            setTableRefining(prev => {
                const newState = {
                    ...prev,
                    rows: res.data.rows,
                    cols: res.data.cols,
                    cells: res.data.cells,
                    preview: res.data.preview,
                    settings: newSettings
                };
                recordTableHistory(newState);
                return newState;
            });

            setRegions(prev => prev.map(r => r.id === regionId ? {
                ...r,
                table_settings: newSettings
            } : r));
        } catch (err) {
            console.error('表格分析失败:', err);
        }
    };

    const handleApplyTableSettings = () => {
        if (selectedRegion) {
            setRegions(prev => prev.map(r => r.id === selectedRegion.id ? {
                ...r,
                table_settings: tableSettings
            } : r));
            handleEnterTableRefine(selectedRegion, tableSettings);
        }
    };

    const handleCommitTableRules = () => {
        if (!tableRefining) return;

        setRegions(prev => prev.map(r => r.id === tableRefining.id ? {
            ...r,
            table_settings: tableRefining.settings
        } : r));

        setSaveSuccess(true);
        setToast({ type: 'success', text: '表格规则已暂存 (草稿)' });
        setTimeout(() => {
            setSaveSuccess(false);
            setToast(null);
        }, 2000);
    };

    const handleSaveTemplate = async (isAsNew = false) => {
        try {
            let saveId = analysis.id;
            if (isAsNew) {
                saveId = `${analysis.id}_${Date.now().toString(36)}`;
            } else if (templateMode === 'custom' && !saveId.includes('_')) {
                saveId = `${saveId}_custom`;
            }
            await axios.post(`${API_BASE}/templates`, {
                id: saveId,
                fingerprint: analysis.fingerprint,
                name: templateName,
                regions: regions,
                filename: analysis.filename, // Pass current filename for archiving
                mode: templateMode // 'auto' or 'custom'
            });
            fetchTemplates();
            setStep('complete');
        } catch (err) {
            console.error(err);
            alert('保存模板失败: ' + (err.response?.data?.detail || err.message));
        }
    };

    const deleteRegion = (ids) => {
        const idsToDelete = Array.isArray(ids) ? ids : [ids];
        const newRegions = regions.filter(r => !idsToDelete.includes(r.id));
        setRegions(newRegions);
        recordHistory(newRegions);
        if (idsToDelete.includes(selectedId)) setSelectedId(null);
        setSelectedIds(prev => prev.filter(id => !idsToDelete.includes(id)));
    };

    const updateRegionLabel = (id, label) => {
        const newRegions = regions.map(r => r.id === id ? { ...r, label } : r);
        setRegions(newRegions);
        recordHistory(newRegions);
    };

    const updateRegionType = (id, type) => {
        const newRegions = regions.map(r => r.id === id ? {
            ...r,
            type,
            label: TYPE_CONFIG[type]?.label || type
        } : r);
        setRegions(newRegions);
        recordHistory(newRegions);
    };

    const toggleRegionLock = (id) => {
        const newRegions = regions.map(r => r.id === id ? { ...r, locked: !r.locked } : r);
        setRegions(newRegions);
        recordHistory(newRegions);
    };

    const updateRegionRemarks = (id, remarks) => {
        const newRegions = regions.map(r => r.id === id ? { ...r, remarks } : r);
        setRegions(newRegions);
        recordHistory(newRegions);
    };

    const clearAllRegions = () => {
        if (regions.length === 0) return;
        if (window.confirm('确定要清空预览中的所有区块吗？此操作可以被撤销。')) {
            setRegions([]);
            recordHistory([]);
            setSelectedId(null);
            setSelectedIds([]);
            setToast({ type: 'success', text: '已清空所有区块' });
            setTimeout(() => setToast(null), 2000);
        }
    };

    const selectedRegion = useMemo(() => regions.find(r => r.id === selectedId), [regions, selectedId]);


    const filteredRegions = useMemo(() => {
        const activeFilters = Object.entries(viewFilters).filter(([_, v]) => v).map(([k, _]) => k);
        if (activeFilters.length === 0) return regions;
        return regions.filter(r => activeFilters.includes(r.type.toLowerCase()));
    }, [regions, viewFilters]);

    return (
        <div style={{ padding: '0 20px 40px', position: 'relative' }}>
            <main style={{
                display: 'grid',
                gridTemplateColumns: `${leftPanelCollapsed ? '64px' : '300px'} minmax(740px, 1fr) ${rightPanelCollapsed ? '64px' : '300px'}`,
                gap: '20px',
                alignItems: 'start',
                marginTop: '20px',
                transition: 'grid-template-columns 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
                {/* Left Panel - Templates */}
                <LeftPanel
                    headerCollapsed={headerCollapsed}
                    collapsed={leftPanelCollapsed}
                    setCollapsed={setLeftPanelCollapsed}
                    templates={templates}
                    analysis={analysis}
                    onAnalyze={analyze}
                    onSelectTemplate={handleSelectTemplate}
                    onDeleteTemplate={handleDeleteTemplate}
                    setToast={setToast}
                    templateMode={templateMode}
                    setTemplateMode={setTemplateMode}
                />

                {/* Center Panel - Main Content */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    minWidth: 0,
                    position: 'sticky',
                    top: '20px',
                    height: headerCollapsed ? 'calc(100vh - 76px)' : 'calc(100vh - 100px)'
                }}>
                    {step === 'review' && (
                        <>
                            <div className="glass-card" style={{ padding: '0', minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', flex: 1, background: 'var(--glass-bg)', overflow: 'hidden' }}>
                                <TopToolbar
                                    tableRefining={tableRefining}
                                    selectedRegion={selectedRegion}
                                    handleEnterTableRefine={handleEnterTableRefine}
                                    layoutSettings={layoutSettings}
                                    setLayoutSettings={setLayoutSettings}
                                    confidence={confidence}
                                    setConfidence={setConfidence}
                                    analyze={analyze}
                                    file={file}
                                    loading={loading}
                                    zoom={zoom}
                                    setZoom={setZoom}
                                    viewFilters={viewFilters}
                                    setViewFilters={setViewFilters}
                                    showRegions={showRegions}
                                    setShowRegions={setShowRegions}
                                    typeConfig={TYPE_CONFIG}
                                    isIntegrated={true}
                                    showSplitPreview={showSplitPreview}
                                    setShowSplitPreview={setShowSplitPreview}
                                    // New Editing Props
                                    editorMode={editorMode}
                                    setEditorMode={setEditorMode}
                                    toggleRegionLock={toggleRegionLock}
                                    deleteRegion={deleteRegion}
                                    clearAllRegions={clearAllRegions}
                                    selectedIds={selectedIds}
                                    setSelectedIds={setSelectedIds}
                                    deviceUsed={lastDeviceUsed}
                                    inferenceTime={inferenceTime}
                                    // Undo/Redo Props
                                    undo={undo}
                                    redo={redo}
                                    historyIndex={historyIndex}
                                    historyLength={history.length}
                                    tableUndo={tableUndo}
                                    tableRedo={tableRedo}
                                    tableHistoryIndex={tableHistoryIndex}
                                    tableHistoryLength={tableHistory.length}
                                />

                                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 0 }}>
                                    {loading && (
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', borderRadius: '12px' }}>
                                            <div className="loading-spinner" />
                                            <p style={{ color: 'white' }}>
                                                {analysis === null && regions.length > 0 ? "正在加载模板源文件..." : "正在处理 PDF 单据..."}
                                            </p>
                                        </div>
                                    )}

                                    {!analysis ? (
                                        <div
                                            onDragEnter={handleDrag}
                                            onDragOver={handleDrag}
                                            onDragLeave={handleDrag}
                                            onDrop={handleDrop}
                                            style={{
                                                flex: 1,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: emptyDragActive ? 'var(--primary-color)' : 'var(--text-secondary)',
                                                gap: '20px',
                                                padding: '40px',
                                                transition: 'all 0.3s ease'
                                            }}
                                        >
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                aspectRatio: '1/1',
                                                height: '400px',
                                                border: emptyDragActive ? '3px dashed var(--primary-color)' : 'none',
                                                borderRadius: '24px',
                                                textAlign: 'center',
                                                background: emptyDragActive ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                                                transition: 'all 0.3s ease',
                                                transform: emptyDragActive ? 'scale(1.02)' : 'scale(1)'
                                            }}>
                                                <Upload size={64} style={{ opacity: emptyDragActive ? 1 : 0.3, marginBottom: '25px', transition: 'all 0.3s ease' }} />
                                                <h2 style={{ marginBottom: '10px' }}>工作台就绪</h2>
                                                <p style={{ fontSize: '15px' }}>
                                                    {emptyDragActive ? '松开即刻识别' : '拖拽 PDF 到此处开始制作'}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {tableRefining && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                                    <button onClick={() => setTableRefining(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '14px' }}>
                                                        <ChevronLeft size={16} /> 返回版面分析
                                                    </button>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success-color)', fontWeight: 'bold', fontSize: '13px' }}>
                                                        <Grid size={16} /> 表格微调模式
                                                    </div>
                                                </div>
                                            )}

                                            <div
                                                className="split-container"
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: showSplitPreview ? `${splitPercent}% 4px 1fr` : '1fr',
                                                    gap: '0',
                                                    flex: 1,
                                                    minHeight: 0,
                                                    height: '100%',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        position: 'relative',
                                                        minWidth: 0,
                                                        height: '100%',
                                                        minHeight: 0,
                                                        maxHeight: 'none',
                                                        overflow: 'auto',
                                                        borderRadius: '16px',
                                                        border: '1px solid var(--glass-border)',
                                                        background: 'rgba(0,0,0,0.05)'
                                                    }}
                                                >
                                                    <DocumentEditor
                                                        image={analysis ? `${API_BASE}/static/${analysis.images[0]}` : null}
                                                        regions={regions}
                                                        viewFilters={viewFilters}
                                                        setRegions={setRegions}
                                                        selectedIds={selectedIds}
                                                        setSelectedIds={setSelectedIds}
                                                        selectedId={selectedId}
                                                        setSelectedId={setSelectedId}
                                                        editorMode={editorMode}
                                                        tableRefining={tableRefining}
                                                        setTableRefining={setTableRefining}
                                                        onAnalyze={(newSettings) => handleAnalyzeTable(tableRefining.id, newSettings)}
                                                        onSettingsChange={(newSettings) => setTableSettings(prev => ({ ...prev, ...newSettings }))}
                                                        zoom={zoom}
                                                        showRegions={showRegions}
                                                        onDelete={deleteRegion}
                                                        onToggleLock={toggleRegionLock}
                                                        onHistorySnapshot={(newRegs) => recordHistory(newRegs || regions)}
                                                    />
                                                </div>

                                                {showSplitPreview && (
                                                    <>
                                                        <div
                                                            style={{
                                                                width: '4px',
                                                                cursor: 'col-resize',
                                                                background: isResizingSplit ? 'var(--primary-color)' : 'transparent',
                                                                transition: 'background 0.2s',
                                                                margin: '0 8px',
                                                                borderRadius: '2px',
                                                                zIndex: 10
                                                            }}
                                                            onMouseEnter={(e) => e.target.style.background = 'var(--glass-border)'}
                                                            onMouseLeave={(e) => !isResizingSplit && (e.target.style.background = 'transparent')}
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                setIsResizingSplit(true);
                                                                const container = e.currentTarget.parentElement;
                                                                const containerRect = container.getBoundingClientRect();

                                                                const handleMouseMove = (moveE) => {
                                                                    const relativeX = moveE.clientX - containerRect.left;
                                                                    const percent = (relativeX / containerRect.width) * 100;
                                                                    setSplitPercent(Math.max(20, Math.min(80, percent)));
                                                                };

                                                                const handleMouseUp = () => {
                                                                    setIsResizingSplit(false);
                                                                    document.removeEventListener('mousemove', handleMouseMove);
                                                                    document.removeEventListener('mouseup', handleMouseUp);
                                                                };

                                                                document.addEventListener('mousemove', handleMouseMove);
                                                                document.addEventListener('mouseup', handleMouseUp);
                                                            }}
                                                        />
                                                        <div style={{ minWidth: 0, minHeight: 0, overflow: 'auto', borderRadius: '16px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.1)', height: '100%' }}>
                                                            <DataPreview
                                                                tableRefining={tableRefining}
                                                                isSplit={true}
                                                                regions={tableRefining ? [] : (selectedIds.length > 0 ? regions.filter(r => selectedIds.includes(r.id)) : (selectedId ? regions.filter(r => r.id === selectedId) : []))}
                                                                typeConfig={TYPE_CONFIG}
                                                                loading={previewLoading}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {/* DataPreview 移至分屏内部或通过 showSplitPreview 控制 */}
                                        </>
                                    )}
                                </div>

                                {/* Footer Bar for Metrics */}
                                {(lastDeviceUsed || inferenceTime > 0) && (
                                    <div style={{
                                        height: '42px',
                                        borderTop: '1px solid var(--glass-border)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'flex-end',
                                        padding: '0 20px',
                                        gap: '20px',
                                        background: 'rgba(255,255,255,0.02)'
                                    }}>
                                        {lastDeviceUsed && (
                                            <div style={{
                                                fontSize: '11px',
                                                color: 'var(--primary-color)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                fontWeight: 'bold'
                                            }}>
                                                <Hash size={12} /> {lastDeviceUsed.toUpperCase()}
                                            </div>
                                        )}
                                        {inferenceTime > 0 && (
                                            <div style={{
                                                fontSize: '11px',
                                                color: 'var(--success-color)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                fontWeight: 'bold'
                                            }}>
                                                <Zap size={12} /> {(inferenceTime * 1000).toFixed(0)}ms
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {step === 'complete' && (
                        <div className="glass-card" style={{
                            padding: '40px',
                            textAlign: 'center',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <div style={{ width: '80px', height: '80px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--success-color)' }}>
                                <CheckCircle size={40} />
                            </div>
                            <h2 style={{ marginBottom: '10px' }}>识别模板已沉淀</h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            </p>
                            <button className="btn-primary" onClick={() => setStep('review')} style={{ padding: '12px 32px' }}>返回工作台</button>
                        </div>
                    )}
                </div>

                {/* Right Panel - Editor */}
                <RightSidebar
                    headerCollapsed={headerCollapsed}
                    collapsed={rightPanelCollapsed}
                    setCollapsed={setRightPanelCollapsed}
                    tableRefining={tableRefining}
                    setTableRefining={setTableRefining}
                    selectedRegion={selectedRegion}
                    selectedId={selectedId}
                    setSelectedId={setSelectedId}
                    editorMode={editorMode}
                    setEditorMode={setEditorMode}
                    historyIndex={historyIndex}
                    historyLength={history.length}
                    undo={undo}
                    redo={redo}
                    tableHistoryIndex={tableHistoryIndex}
                    tableHistoryLength={tableHistory.length}
                    tableUndo={tableUndo}
                    tableRedo={tableRedo}
                    deleteRegion={deleteRegion}
                    updateRegionType={updateRegionType}
                    updateRegionLabel={updateRegionLabel}
                    updateRegionRemarks={updateRegionRemarks}
                    toggleRegionLock={toggleRegionLock}
                    tableSettings={tableSettings}
                    setTableSettings={setTableSettings}
                    handleApplyTableSettings={handleApplyTableSettings}
                    handleCommitTableRules={handleCommitTableRules}
                    handleEnterTableRefine={handleEnterTableRefine}
                    templateName={templateName}
                    setTemplateName={setTemplateName}
                    handleSaveTemplate={handleSaveTemplate}
                    saveSuccess={saveSuccess}
                    templateMode={templateMode}
                    setTemplateMode={setTemplateMode}
                    loading={loading || !analysis} // Disable some buttons if no analysis
                    typeConfig={TYPE_CONFIG}
                    theme={theme}
                />
            </main>

            {/* Toast Message */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    top: '30px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 9999,
                    animation: 'slideDown 0.3s ease-out'
                }}>
                    <div style={{
                        background: 'var(--success-color)',
                        color: 'white',
                        padding: '10px 24px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                        fontWeight: 'bold'
                    }}>
                        <CheckCircle size={18} />
                        {toast.text}
                    </div>
                </div>
            )}
        </div>
    );
}
