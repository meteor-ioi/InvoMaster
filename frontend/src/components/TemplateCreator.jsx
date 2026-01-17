import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { CheckCircle, ChevronLeft, Sun, Moon, Grid, Upload } from 'lucide-react';
import DocumentEditor, { TYPE_CONFIG } from './DocumentEditor';
import TopToolbar from './TopToolbar';
import LeftPanel from './LeftPanel';
import RightSidebar from './RightSidebar';
import DataPreview from './DataPreview';

const API_BASE = 'http://localhost:8000';

export default function TemplateCreator({ theme, setTheme }) {
    const [file, setFile] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState('review'); // Default to review mode directly
    const [templates, setTemplates] = useState([]);
    const [templateName, setTemplateName] = useState('');

    const [editorMode, setEditorMode] = useState('view');
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [toast, setToast] = useState(null);
    const [emptyDragActive, setEmptyDragActive] = useState(false);
    const [templateMode, setTemplateMode] = useState('auto'); // 'auto' or 'custom'

    // --- 版面识别增强状态 ---
    const [layoutSettings, setLayoutSettings] = useState({
        strategy: 'balanced',
        imgsz: 1024,
        iou: 0.45,
        agnostic_nms: false
    });
    const [viewFilters, setViewFilters] = useState({});

    const applyStrategy = (strategy) => {
        let settings = { strategy };
        if (strategy === 'fast') {
            settings = { ...settings, imgsz: 640, iou: 0.5, agnostic_nms: false };
            setConfidence(0.35);
        } else if (strategy === 'balanced') {
            settings = { ...settings, imgsz: 1024, iou: 0.45, agnostic_nms: false };
            setConfidence(0.25);
        } else if (strategy === 'precise') {
            settings = { ...settings, imgsz: 1600, iou: 0.35, agnostic_nms: true };
            setConfidence(0.15);
        }
        setLayoutSettings(prev => ({ ...prev, ...settings }));
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
    const [confidence, setConfidence] = useState(0.25);
    const [device, setDevice] = useState('mps');
    const [zoom, setZoom] = useState(1.0);
    const [showRegions, setShowRegions] = useState(true);
    const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
    const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
    const [showSplitPreview, setShowSplitPreview] = useState(false);
    const [splitPercent, setSplitPercent] = useState(50);
    const [isResizingSplit, setIsResizingSplit] = useState(false);

    useEffect(() => {
        fetchTemplates();
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
        if (!currentFile) return;

        setLoading(true);
        const formData = new FormData();
        formData.append('file', currentFile);
        if (targetFile) setFile(targetFile);

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
                    refresh: isRefresh
                }
            });
            setAnalysis(res.data);
            const mappedRegions = (res.data.regions || []).map(r => ({
                ...r,
                label: TYPE_CONFIG[r.type.toLowerCase()]?.label || r.label
            }));
            setRegions(mappedRegions);
            setTemplateName(res.data.template_found ? `识别_${res.data.filename}` : `模型_${res.data.filename}`);
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
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/templates/${template.id}/analyze`);
            setAnalysis(res.data);
            const mappedRegions = (res.data.regions || []).map(r => ({
                ...r,
                label: TYPE_CONFIG[r.type.toLowerCase()]?.label || r.label
            }));
            setRegions(mappedRegions);
            setTemplateName(template.name);
            setFile(null); // Clear local file as we are using server source
            setStep('review');
            setEditorMode('view');
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
        const s = settingsOverride || region.table_settings || tableSettings;

        if (region.table_settings && !settingsOverride) {
            setTableSettings(region.table_settings);
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
            console.error('表格重新分析失败:', err);
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

    const handleSaveTemplate = async () => {
        try {
            await axios.post(`${API_BASE}/templates`, {
                id: analysis.id,
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

    const deleteRegion = (id) => {
        const newRegions = regions.filter(r => r.id !== id);
        setRegions(newRegions);
        recordHistory(newRegions);
        if (selectedId === id) setSelectedId(null);
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
                gridTemplateColumns: `${leftPanelCollapsed ? '64px' : '260px'} minmax(0, 1fr) ${rightPanelCollapsed ? '64px' : '300px'}`,
                gap: '20px',
                alignItems: 'start',
                marginTop: '20px'
            }}>
                {/* Left Panel - Templates */}
                <LeftPanel
                    collapsed={leftPanelCollapsed}
                    setCollapsed={setLeftPanelCollapsed}
                    templates={templates}
                    analysis={analysis}
                    onAnalyze={analyze}
                    onSelectTemplate={handleSelectTemplate}
                    onDeleteTemplate={handleDeleteTemplate}
                    setToast={setToast}
                />

                {/* Center Panel - Main Content */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    minWidth: 0,
                    position: 'sticky',
                    top: '20px',
                    height: 'calc(100vh - 100px)'
                }}>
                    {step === 'review' && (
                        <>
                            <div className="glass-card" style={{ padding: '0', minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', flex: 1, background: 'var(--glass-bg)', overflow: 'hidden' }}>
                                <TopToolbar
                                    tableRefining={tableRefining}
                                    selectedRegion={selectedRegion}
                                    handleEnterTableRefine={handleEnterTableRefine}
                                    layoutSettings={layoutSettings}
                                    applyStrategy={applyStrategy}
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
                                />

                                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 0 }}>
                                    {loading && (
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', borderRadius: '12px' }}>
                                            <div className="loading-spinner" />
                                            <p style={{ color: 'white' }}>正在处理 PDF 单据...</p>
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
                                                border: emptyDragActive ? '3px dashed var(--primary-color)' : '2px dashed var(--glass-border)',
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
                                                    gridTemplateColumns: (tableRefining && showSplitPreview) ? `${splitPercent}% 4px 1fr` : '1fr',
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
                                                        minHeight: 0,
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
                                                        image={`${API_BASE}/static/${analysis.images[0]}`}
                                                        regions={regions}
                                                        viewFilters={viewFilters}
                                                        setRegions={setRegions}
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

                                                {tableRefining && showSplitPreview && (
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
                                                            <DataPreview tableRefining={tableRefining} isSplit={true} />
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {/* DataPreview 移至分屏内部或通过 showSplitPreview 控制 */}
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {step === 'complete' && (
                        <div className="glass-card" style={{ padding: '80px', textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 30px', color: 'var(--success-color)' }}>
                                <CheckCircle size={40} />
                            </div>
                            <h2 style={{ marginBottom: '10px' }}>识别模板已沉淀</h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>该单据的指纹与布局规则已关联，且源 PDF 已备份至库中。后续可随时从列表中再次加载修改。</p>
                            <button className="btn-primary" onClick={() => setStep('review')} style={{ padding: '12px 32px' }}>返回工作台</button>
                        </div>
                    )}
                </div>

                {/* Right Panel - Editor */}
                <RightSidebar
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
