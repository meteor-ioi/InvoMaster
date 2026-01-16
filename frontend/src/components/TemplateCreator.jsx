import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Upload, CheckCircle, ChevronLeft, Sun, Moon, Grid, Home } from 'lucide-react'; // Added Home icon
import DocumentEditor, { TYPE_CONFIG } from './DocumentEditor';
import TopToolbar from './TopToolbar';
import LeftPanel from './LeftPanel';
import RightSidebar from './RightSidebar';
import DataPreview from './DataPreview';

const API_BASE = 'http://localhost:8000';

export default function TemplateCreator({ onBack }) { // Accept onBack prop
    const [file, setFile] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState('upload');
    const [templates, setTemplates] = useState([]);
    const [templateName, setTemplateName] = useState('');

    const [theme, setTheme] = useState(localStorage.getItem('babeldoc-theme') || 'dark');
    const [editorMode, setEditorMode] = useState('view');
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [toast, setToast] = useState(null);

    // --- 版面识别增强状态 ---
    const [layoutSettings, setLayoutSettings] = useState({
        strategy: 'balanced',
        imgsz: 1024,
        iou: 0.45,
        agnostic_nms: false
    });
    const [viewFilters, setViewFilters] = useState({
        // Default all visible
    });

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
        snap_tolerance: 3,
        join_tolerance: 3,
    });

    const [regions, setRegions] = useState([]);
    const [history, setHistory] = useState([[]]);
    const [historyIndex, setHistoryIndex] = useState(0);

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
    const [dragActive, setDragActive] = useState(false);
    const [showRegions, setShowRegions] = useState(true);
    const [previewPanelHeight, setPreviewPanelHeight] = useState(500);
    const [isResizingPanel, setIsResizingPanel] = useState(false);
    const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false); // Templates expanded by default
    const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false); // Editor expanded by default

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('babeldoc-theme', theme);
    }, [theme]);

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

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            setFile(droppedFile);
            await analyze(droppedFile);
        }
    };

    const handleFileUpload = async (e) => {
        const uploadedFile = e.target.files[0];
        if (!uploadedFile) return;
        setFile(uploadedFile);
        await analyze(uploadedFile);
    };

    const analyze = async (targetFile, forceParams = {}) => {
        const formData = new FormData();
        formData.append('file', targetFile || file);

        setLoading(true);
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

            setTableRefining({
                id: region.id,
                filename: analysis.filename,
                rows: res.data.rows,
                cols: res.data.cols,
                cells: res.data.cells,
                preview: res.data.preview,
                settings: s
            });
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

            setTableRefining(prev => ({
                ...prev,
                rows: res.data.rows,
                cols: res.data.cols,
                cells: res.data.cells,
                preview: res.data.preview,
                settings: newSettings
            }));

            // CRITICAL: Update the global regions state so that "Save Recognition Rules" picks up the new settings
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

        // Update the regions with the latest table refinement data
        setRegions(prev => prev.map(r => r.id === tableRefining.id ? {
            ...r,
            table_settings: tableRefining.settings
        } : r));

        // Provide success feedback
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
                regions: regions
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

    const sortedTemplates = useMemo(() => {
        if (!analysis) return templates;
        return [...templates].sort((a, b) => {
            if (a.fingerprint === analysis.fingerprint) return -1;
            if (b.fingerprint === analysis.fingerprint) return 1;
            return 0;
        });
    }, [templates, analysis]);

    const filteredRegions = useMemo(() => {
        const activeFilters = Object.entries(viewFilters).filter(([_, v]) => v).map(([k, _]) => k);
        if (activeFilters.length === 0) return regions;
        return regions.filter(r => activeFilters.includes(r.type.toLowerCase()));
    }, [regions, viewFilters]);

    return (
        <div style={{ padding: step === 'review' ? '0 20px 40px' : '40px 20px', position: 'relative' }}>
            <button
                onClick={onBack}
                style={{
                    position: 'absolute', top: '20px', left: '20px',
                    display: 'flex', alignItems: 'center', gap: '5px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-secondary)', zIndex: 10
                }}
            >
                <Home size={18} /> 回到首页
            </button>

            <header style={{ position: 'relative', textAlign: 'center', marginBottom: step === 'review' ? '30px' : '40px' }}>
                {step !== 'review' && (
                    <>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '10px' }}>
                            模板制作工作台
                        </h1>
                        <p style={{ color: 'var(--text-secondary)' }}>基于 AI 的文档标注与规则定义</p>
                    </>
                )}

                <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    style={{
                        position: 'fixed',
                        bottom: '30px',
                        right: '30px',
                        background: 'var(--input-bg)', border: '1px solid var(--glass-border)',
                        padding: '10px', borderRadius: '12px', cursor: 'pointer', color: 'var(--text-primary)',
                        zIndex: 1000,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                >
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </header>

            <main style={{
                display: 'grid',
                gridTemplateColumns: step === 'review' && analysis
                    ? `${leftPanelCollapsed ? '48px' : '260px'} minmax(0, 1fr) ${rightPanelCollapsed ? '48px' : '340px'}`
                    : '1fr',
                gap: '20px',
                alignItems: 'start'
            }}>
                {/* Left Panel - Templates */}
                {step === 'review' && analysis && (
                    <LeftPanel
                        collapsed={leftPanelCollapsed}
                        setCollapsed={setLeftPanelCollapsed}
                        templates={templates}
                        sortedTemplates={sortedTemplates}
                        analysis={analysis}
                    />
                )}

                {/* Center Panel - Main Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
                    {step === 'upload' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px', maxWidth: '600px', margin: '0 auto' }}>
                            <div
                                className={`glass-card ${dragActive ? 'drag-active' : ''}`}
                                style={{
                                    width: '100%', padding: '80px 40px', textAlign: 'center',
                                    border: dragActive ? '2px solid var(--primary-color)' : '2px dashed var(--glass-border)',
                                    background: dragActive ? 'rgba(59, 130, 246, 0.05)' : 'var(--glass-bg)',
                                    transition: 'all 0.2s ease'
                                }}
                                onDragEnter={handleDrag}
                                onDragOver={handleDrag}
                                onDragLeave={handleDrag}
                                onDrop={handleDrop}
                            >
                                {loading ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                                        <div className="loading-spinner" />
                                        <p>正在运用 AI 执行版面分析与要素识别...</p>
                                    </div>
                                ) : (
                                    <>
                                        <Upload size={48} color={dragActive ? "var(--primary-color)" : "var(--text-secondary)"} style={{ marginBottom: '20px', opacity: 0.8 }} />
                                        <h2 style={{ marginBottom: '10px' }}>{dragActive ? "松开放置文件" : "上传 PDF 单据"}</h2>
                                        <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>支持拖拽文件或点击上传（补料单、装箱单、发票等）</p>
                                        <label className="btn-primary" style={{ cursor: 'pointer', display: 'inline-block', padding: '12px 32px' }}>
                                            立即上传并识别
                                            <input type="file" className="hidden" accept="application/pdf" onChange={handleFileUpload} />
                                        </label>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 'review' && analysis && (
                        <>
                            {/* Layered Control Panel (Option 2) */}
                            {/* Layered Control Panel (TopToolbar) */}
                            <TopToolbar
                                tableRefining={tableRefining}
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
                            />

                            <div className="glass-card" style={{ padding: '20px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
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
                                    style={{
                                        position: 'relative',
                                        minWidth: 0,
                                        height: `${previewPanelHeight}px`,
                                        minHeight: '200px',
                                        maxHeight: '1000px',
                                        overflow: 'auto',
                                        borderRadius: '8px',
                                        border: '1px solid var(--glass-border)'
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

                                {/* Resize Handle */}
                                <div
                                    style={{
                                        height: '12px',
                                        cursor: 'ns-resize',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'var(--input-bg)',
                                        borderRadius: '0 0 8px 8px',
                                        marginTop: '4px'
                                    }}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        setIsResizingPanel(true);
                                        const startY = e.clientY;
                                        const startHeight = previewPanelHeight;
                                        const handleMouseMove = (moveE) => {
                                            const delta = moveE.clientY - startY;
                                            setPreviewPanelHeight(Math.max(200, Math.min(1000, startHeight + delta)));
                                        };
                                        const handleMouseUp = () => {
                                            setIsResizingPanel(false);
                                            document.removeEventListener('mousemove', handleMouseMove);
                                            document.removeEventListener('mouseup', handleMouseUp);
                                        };
                                        document.addEventListener('mousemove', handleMouseMove);
                                        document.addEventListener('mouseup', handleMouseUp);
                                    }}
                                >
                                    <div style={{ width: '40px', height: '4px', background: 'var(--glass-border)', borderRadius: '2px' }} />
                                </div>

                                {tableRefining && (
                                    <DataPreview tableRefining={tableRefining} />
                                )}
                            </div>
                        </>
                    )}

                    {step === 'complete' && (
                        <div className="glass-card" style={{ padding: '80px', textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 30px', color: 'var(--success-color)' }}>
                                <CheckCircle size={40} />
                            </div>
                            <h2 style={{ marginBottom: '10px' }}>识别模板已沉淀</h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>该单据的指纹与布局规则已关联。后续同类单据将实现自动提取。</p>
                            <button className="btn-primary" onClick={() => setStep('upload')} style={{ padding: '12px 32px' }}>处理下一张</button>
                        </div>
                    )}
                </div>

                {/* Right Panel - Editor */}
                {step === 'review' && analysis && (
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
                        loading={loading}
                        typeConfig={TYPE_CONFIG}
                        theme={theme}
                    />
                )}
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
