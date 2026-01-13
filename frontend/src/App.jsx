import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Upload, CheckCircle, Settings, RefreshCw, ChevronLeft, ChevronRight, Layout, Star, Trash2, Edit3, Save, Sun, Moon, Plus, Minus, Grid, X, HelpCircle, Eye, EyeOff, RotateCcw, RotateCw, Filter, Zap, ShieldCheck, Microscope } from 'lucide-react';
import DocumentEditor, { TYPE_CONFIG } from './components/DocumentEditor';

const API_BASE = 'http://localhost:8000';

function App() {
    const [file, setFile] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState('upload');
    const [templates, setTemplates] = useState([]);
    const [templateName, setTemplateName] = useState('');

    const [theme, setTheme] = useState(localStorage.getItem('babeldoc-theme') || 'dark');
    const [editorMode, setEditorMode] = useState('view');

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
            setRegions(res.data.regions || []);
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
        const newRegions = regions.map(r => r.id === id ? { ...r, type } : r);
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
        <div className="container" style={{ maxWidth: '1440px', margin: '0 auto', padding: step === 'review' ? '0 20px 40px' : '40px 20px', position: 'relative' }}>
            <header style={{ position: 'relative', textAlign: 'center', marginBottom: step === 'review' ? '30px' : '40px' }}>
                {step !== 'review' && (
                    <>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '10px' }}>
                            <span className="gradient-text">影刀</span> 离线单据识别
                        </h1>
                        <p style={{ color: 'var(--text-secondary)' }}>基于 AI 的交互式数据采集与模板沉淀平台</p>
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
                    <aside
                        className="glass-card"
                        style={{
                            padding: leftPanelCollapsed ? '10px' : '15px',
                            position: 'sticky',
                            top: '20px',
                            transition: 'all 0.3s ease',
                            overflow: 'hidden'
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: leftPanelCollapsed ? 'center' : 'space-between',
                                cursor: 'pointer',
                                marginBottom: leftPanelCollapsed ? 0 : '10px',
                                paddingBottom: leftPanelCollapsed ? 0 : '10px',
                                borderBottom: leftPanelCollapsed ? 'none' : '1px solid var(--glass-border)'
                            }}
                            onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
                        >
                            {!leftPanelCollapsed && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Layout size={16} color="var(--primary-color)" />
                                    <span style={{ fontSize: '13px', fontWeight: 'bold' }}>已存模板 ({templates.length})</span>
                                </div>
                            )}
                            {leftPanelCollapsed ? (
                                <ChevronRight size={18} color="var(--text-secondary)" />
                            ) : (
                                <ChevronLeft size={18} color="var(--text-secondary)" />
                            )}
                        </div>

                        {!leftPanelCollapsed && (
                            <div style={{ maxHeight: '400px', overflowY: 'auto' }} className="custom-scrollbar">
                                {sortedTemplates.length > 0 ? sortedTemplates.map(t => {
                                    const IsMatched = analysis && t.fingerprint === analysis.fingerprint;
                                    return (
                                        <div key={t.id} className={IsMatched ? 'matched-scan-effect' : ''} style={{ padding: '8px', borderRadius: '6px', background: IsMatched ? 'rgba(16, 185, 129, 0.05)' : 'var(--input-bg)', border: IsMatched ? '1px solid var(--success-color)' : '1px solid var(--glass-border)', marginBottom: '6px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 'bold', color: IsMatched ? 'var(--success-color)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                                                {IsMatched && <Star size={10} color="var(--success-color)" fill="var(--success-color)" />}
                                            </div>
                                        </div>
                                    );
                                }) : <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', padding: '10px' }}>暂无模板</p>}
                            </div>
                        )}
                    </aside>
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
                            {!tableRefining && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {/* Layer 1: Identification Settings */}
                                    <div className="glass-card" style={{ padding: '12px 20px', borderBottom: '2px solid var(--glass-border)', overflow: 'hidden' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1, minWidth: 0 }}>
                                                {/* Strategy Toggle */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                                                    <Zap size={16} color="var(--primary-color)" />
                                                    <span style={{ fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>识别策略:</span>
                                                    <div className="strategy-toggle" style={{ display: 'flex', background: 'var(--input-bg)', padding: '3px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                                        {['fast', 'balanced', 'precise'].map(s => (
                                                            <button
                                                                key={s}
                                                                onClick={() => applyStrategy(s)}
                                                                style={{
                                                                    padding: '4px 12px', borderRadius: '6px', fontSize: '11px', border: 'none', cursor: 'pointer',
                                                                    background: layoutSettings.strategy === s ? 'var(--primary-color)' : 'transparent',
                                                                    color: layoutSettings.strategy === s ? '#fff' : 'var(--text-secondary)',
                                                                    fontWeight: layoutSettings.strategy === s ? 'bold' : 'normal',
                                                                    transition: 'all 0.2s', whiteSpace: 'nowrap'
                                                                }}
                                                            >
                                                                {s === 'fast' ? '极速' : s === 'balanced' ? '平衡' : '精细'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Parameters Area */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', paddingLeft: '20px', borderLeft: '1px solid var(--glass-border)', flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>分辨率:</span>
                                                        <select
                                                            value={layoutSettings.imgsz}
                                                            onChange={(e) => setLayoutSettings({ ...layoutSettings, imgsz: parseInt(e.target.value), strategy: 'custom' })}
                                                            style={{ background: 'var(--input-bg)', border: '1px solid var(--glass-border)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '11px', outline: 'none' }}
                                                        >
                                                            {[640, 800, 1024, 1280, 1600, 2048].map(size => <option key={size} value={size}>{size}</option>)}
                                                        </select>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '150px' }}>
                                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>置信度:</span>
                                                        <input
                                                            type="range" min="0.05" max="0.6" step="0.05"
                                                            value={confidence} onChange={(e) => setConfidence(parseFloat(e.target.value))}
                                                            style={{ flex: 1, minWidth: '80px', maxWidth: '300px', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
                                                        />
                                                        <span style={{ fontSize: '11px', minWidth: '30px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{confidence.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => analyze(file, { refresh: true })}
                                                disabled={loading}
                                                className="btn-primary"
                                                style={{ padding: '8px 20px', fontSize: '12px', background: 'var(--accent-color)', whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}
                                            >
                                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 重新分析
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Layer 2: View Tools - Always visible */}
                            <div className="glass-card" style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: tableRefining ? '0' : '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--input-bg)', padding: '2px 8px', borderRadius: '6px' }}>
                                        <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><Minus size={14} /></button>
                                        <span style={{ fontSize: '12px', minWidth: '35px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
                                        <button onClick={() => setZoom(z => Math.min(2.0, z + 0.1))} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><Plus size={14} /></button>
                                        <button onClick={() => {
                                            if (zoom < 1.49) setZoom(1.5);
                                            else if (zoom < 1.99) setZoom(2.0);
                                            else setZoom(1.0);
                                        }} style={{ fontSize: '10px', background: 'var(--glass-border)', border: 'none', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-primary)', marginLeft: '4px' }}>自适应</button>
                                    </div>
                                    {!tableRefining && (
                                        <>
                                            <div style={{ height: '16px', width: '1px', background: 'var(--glass-border)' }} />
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Filter size={14} color="var(--text-secondary)" />
                                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>仅查看:</span>
                                                {['table', 'title', 'figure', 'header', 'footer', 'text'].map(type => (
                                                    <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '11px' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={!!viewFilters[type]}
                                                            onChange={(e) => setViewFilters({ ...viewFilters, [type]: e.target.checked })}
                                                            style={{ accentColor: 'var(--success-color)' }}
                                                        />
                                                        {TYPE_CONFIG[type]?.label || type}
                                                    </label>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <button
                                        onClick={() => setShowRegions(!showRegions)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px',
                                            borderRadius: '6px', border: '1px solid var(--glass-border)',
                                            background: 'transparent', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer'
                                        }}
                                    >
                                        {showRegions ? <Eye size={12} /> : <EyeOff size={12} />}
                                        {showRegions ? '隐藏预览' : '显示预览'}
                                    </button>
                                </div>
                            </div>

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

                                {tableRefining && tableRefining.preview && (
                                    <div style={{ marginTop: '20px', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <h4 style={{ fontSize: '14px', margin: 0, color: 'var(--text-secondary)' }}>实时数据提取 (单元格级预览):</h4>
                                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>共探测到 {tableRefining.cells?.length || 0} 个物理单元格</span>
                                        </div>
                                        <div style={{ width: '100%', overflowX: 'auto', background: 'var(--input-bg)', borderRadius: '12px', padding: '15px', border: '1px solid var(--glass-border)' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                                <tbody>
                                                    {tableRefining.preview.map((row, ridx) => (
                                                        <tr key={ridx} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                                            {row.map((cell, cidx) => (
                                                                <td key={cidx} style={{ padding: '8px 15px', color: 'var(--text-primary)', whiteSpace: 'nowrap', borderRight: '1px solid var(--glass-border)' }}>{cell || '-'}</td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
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
                    <aside
                        className="glass-card"
                        style={{
                            padding: rightPanelCollapsed ? '10px' : '15px',
                            position: 'sticky',
                            top: '20px',
                            transition: 'all 0.3s ease',
                            overflow: 'hidden'
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: rightPanelCollapsed ? 'center' : 'space-between',
                                cursor: 'pointer',
                                marginBottom: rightPanelCollapsed ? 0 : '10px',
                                paddingBottom: rightPanelCollapsed ? 0 : '10px',
                                borderBottom: rightPanelCollapsed ? 'none' : '1px solid var(--glass-border)'
                            }}
                            onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
                        >
                            {rightPanelCollapsed ? (
                                <ChevronLeft size={18} color="var(--text-secondary)" />
                            ) : (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Edit3 size={16} color="var(--accent-color)" />
                                        <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{tableRefining ? '策略中心' : '要素编辑'}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {!tableRefining && (
                                            <>
                                                <button onClick={(e) => { e.stopPropagation(); undo(); }} disabled={historyIndex <= 0} title="撤回" style={{ width: '22px', height: '22px', borderRadius: '50%', border: 'none', background: 'var(--input-bg)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: historyIndex > 0 ? 'pointer' : 'not-allowed', opacity: historyIndex > 0 ? 1 : 0.5 }}>
                                                    <RotateCcw size={12} />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); redo(); }} disabled={historyIndex >= history.length - 1} title="重做" style={{ width: '22px', height: '22px', borderRadius: '50%', border: 'none', background: 'var(--input-bg)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: historyIndex < history.length - 1 ? 'pointer' : 'not-allowed', opacity: historyIndex < history.length - 1 ? 1 : 0.5 }}>
                                                    <RotateCw size={12} />
                                                </button>
                                                <div style={{ width: '1px', height: '12px', background: 'var(--glass-border)', margin: '0 4px' }} />
                                                <button onClick={(e) => { e.stopPropagation(); setEditorMode(editorMode === 'add' ? 'view' : 'add'); }} title="新增区块" style={{ width: '22px', height: '22px', borderRadius: '50%', border: 'none', background: editorMode === 'add' ? 'var(--primary-color)' : 'var(--input-bg)', color: editorMode === 'add' ? '#fff' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                                    <Plus size={12} />
                                                </button>
                                                <button disabled={!selectedId} onClick={(e) => { e.stopPropagation(); deleteRegion(selectedId); }} title="删除区块" style={{ width: '22px', height: '22px', borderRadius: '50%', border: 'none', background: 'var(--input-bg)', color: '#ef4444', opacity: selectedId ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: selectedId ? 'pointer' : 'not-allowed' }}>
                                                    <Minus size={12} />
                                                </button>
                                            </>
                                        )}
                                        <ChevronRight size={16} color="var(--text-secondary)" />
                                    </div>
                                </>
                            )}
                        </div>

                        {!rightPanelCollapsed && (
                            <>
                                {tableRefining ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        <div>
                                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                垂直策略 (列) <HelpCircle size={10} />
                                            </p>
                                            <select
                                                value={tableSettings.vertical_strategy}
                                                onChange={(e) => setTableSettings({ ...tableSettings, vertical_strategy: e.target.value })}
                                                style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--glass-border)', padding: '6px', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }}
                                            >
                                                <option value="lines">Lines (基于线)</option>
                                                <option value="text">Text (基于文字对齐)</option>
                                                <option value="rects">Rects (基于块)</option>
                                                <option value="explicit">Explicit (手动模式)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>水平策略 (行)</p>
                                            <select
                                                value={tableSettings.horizontal_strategy}
                                                onChange={(e) => setTableSettings({ ...tableSettings, horizontal_strategy: e.target.value })}
                                                style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--glass-border)', padding: '6px', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }}
                                            >
                                                <option value="lines">Lines (基于线)</option>
                                                <option value="text">Text (基于文字对齐)</option>
                                                <option value="rects">Rects (基于块)</option>
                                                <option value="explicit">Explicit (手动模式)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>吸附容差 (Snap)</p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <input
                                                    type="range" min="1" max="10" step="1"
                                                    value={tableSettings.snap_tolerance || 3}
                                                    onChange={(e) => setTableSettings({ ...tableSettings, snap_tolerance: parseInt(e.target.value) })}
                                                    style={{ flex: 1, accentColor: 'var(--primary-color)', height: '4px' }}
                                                />
                                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', minWidth: '15px' }}>{tableSettings.snap_tolerance || 3}</span>
                                            </div>
                                        </div>

                                        <button onClick={handleApplyTableSettings} disabled={loading} className="btn-primary" style={{ width: '100%', background: 'var(--accent-color)', fontSize: '12px', padding: '8px' }}>
                                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 重新分析结构
                                        </button>

                                        <button onClick={handleSaveTemplate} className="btn-primary" style={{ width: '100%', background: 'var(--success-color)', fontSize: '12px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            <Save size={14} /> 保存识别规则
                                        </button>

                                        <button onClick={() => setTableRefining(null)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-primary)', fontSize: '12px', cursor: 'pointer' }}>
                                            退出微调模式
                                        </button>
                                    </div>
                                ) : selectedRegion ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        {selectedRegion.type === 'table' && (
                                            <button onClick={() => handleEnterTableRefine(selectedRegion)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success-color)', color: 'var(--success-color)', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
                                                <Grid size={16} /> 高精度表格微调
                                            </button>
                                        )}

                                        <div>
                                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>要素分类</p>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                                {[
                                                    'title', 'plain text', 'table caption', 'table', 'figure caption', 'figure', 'header', 'footer', 'list', 'equation', 'text', 'abandon', 'custom'
                                                ].map(type => {
                                                    const config = TYPE_CONFIG[type];
                                                    if (!config) return null;
                                                    return (
                                                        <button key={type} onClick={() => updateRegionType(selectedId, type)} style={{ padding: '6px 8px', borderRadius: '6px', fontSize: '10px', border: `2px solid ${selectedRegion.type === type ? config.color : 'transparent'}`, background: selectedRegion.type === type ? `${config.color}33` : 'var(--input-bg)', color: selectedRegion.type === type ? (theme === 'dark' ? '#fff' : config.color) : 'var(--text-secondary)', fontWeight: selectedRegion.type === type ? 'bold' : 'normal', cursor: 'pointer' }}>
                                                            {config.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div>
                                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>业务标签</p>
                                            <input type="text" value={selectedRegion.label || ''} onChange={(e) => updateRegionLabel(selectedId, e.target.value)} placeholder="如：料号、数量" style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--glass-border)', padding: '8px', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }} />
                                        </div>
                                    </div>
                                ) : (
                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', fontStyle: 'italic', padding: '10px' }}>
                                        {editorMode === 'add' ? '正在新增模式：在左侧图中拖拽即可创建' : '在图中点击选框以开始编辑'}
                                    </p>
                                )}

                                {!tableRefining && (
                                    <div style={{ marginTop: '10px', borderTop: '1px solid var(--glass-border)', paddingTop: '15px' }}>
                                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>保存模板名称</p>
                                        <input type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)} style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--glass-border)', padding: '8px', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px', marginBottom: '15px' }} />
                                        <button onClick={handleSaveTemplate} className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                            <Save size={16} /> 保存并入库
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </aside>
                )}
            </main>
        </div>
    );
}

export default App;
