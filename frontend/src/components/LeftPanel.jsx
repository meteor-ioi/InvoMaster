import React, { useState } from 'react';
import { Layout, Star, ChevronLeft, ChevronRight, ChevronDown, Hash, Grid, FileText, Ban, Layers, ArrowRight, Plus, Upload } from 'lucide-react';
import { TYPE_CONFIG } from './DocumentEditor';

const LeftPanel = ({
    collapsed,
    setCollapsed,
    templates,
    sortedTemplates,
    analysis,
    onAnalyze,
    onSelectTemplate,
    typeConfig = TYPE_CONFIG
}) => {
    const [expandedIds, setExpandedIds] = useState([]);
    const [dragActive, setDragActive] = useState(false);

    const toggleExpand = (id, e) => {
        e.stopPropagation();
        setExpandedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const getIcon = (type) => {
        switch (type.toLowerCase()) {
            case 'table': return <Grid size={10} />;
            case 'title': return <Hash size={10} />;
            case 'abandon': return <Ban size={10} />;
            case 'custom': return <Layers size={10} />;
            default: return <FileText size={10} />;
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

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0] && onAnalyze) {
            onAnalyze(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0] && onAnalyze) {
            onAnalyze(e.target.files[0]);
        }
    };

    return (
        <aside
            style={{
                width: collapsed ? '48px' : '260px',
                minWidth: collapsed ? '48px' : '260px',
                position: 'sticky',
                top: '20px',
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px'
            }}
        >
            {/* 顶栏控制 (折叠按钮) */}
            <div
                className="glass-card"
                style={{
                    padding: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                }}
                onClick={() => setCollapsed(!collapsed)}
            >
                {collapsed ? (
                    <ChevronRight size={18} color="var(--text-secondary)" />
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Layout size={16} color="var(--primary-color)" />
                            <span style={{ fontSize: '13px', fontWeight: 'bold' }}>侧边工作台</span>
                        </div>
                        <ChevronLeft size={18} color="var(--text-secondary)" />
                    </div>
                )}
            </div>

            {!collapsed && (
                <>
                    {/* 卡片 1: 添加文件 */}
                    <div
                        className="glass-card"
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('panel-file-upload').click()}
                        style={{
                            padding: '20px 15px',
                            border: dragActive ? '2px solid var(--primary-color)' : '1px solid var(--glass-border)',
                            background: dragActive ? 'rgba(59, 130, 246, 0.1)' : 'var(--glass-bg)',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '10px',
                            boxShadow: dragActive ? '0 0 15px rgba(59, 130, 246, 0.3)' : 'none'
                        }}
                    >
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'rgba(59, 130, 246, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '4px'
                        }}>
                            <Upload size={20} color="var(--primary-color)" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                {dragActive ? '松开即刻上传' : '添加 PDF 文件'}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                支持拖拽或点击选择
                            </span>
                        </div>
                        <input
                            id="panel-file-upload"
                            type="file"
                            className="hidden"
                            accept="application/pdf"
                            onChange={handleFileSelect}
                        />
                    </div>

                    {/* 卡片 2: 模板列表 */}
                    <div
                        className="glass-card"
                        style={{
                            flex: 1,
                            padding: '15px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            maxHeight: 'calc(100vh - 250px)',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '10px', borderBottom: '1px solid var(--glass-border)' }}>
                            <Star size={14} color="var(--accent-color)" />
                            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>已存模板 ({templates.length})</span>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
                            {sortedTemplates.length > 0 ? sortedTemplates.map(t => {
                                const IsMatched = analysis && t.fingerprint === analysis.fingerprint;
                                const IsSelected = analysis && t.id === analysis.id;

                                return (
                                    <div
                                        key={t.id}
                                        className={IsMatched ? 'matched-scan-effect' : ''}
                                        onClick={() => onSelectTemplate && onSelectTemplate(t)}
                                        style={{
                                            padding: '8px',
                                            borderRadius: '8px',
                                            background: (IsMatched || IsSelected) ? 'rgba(59, 130, 246, 0.08)' : 'var(--input-bg)',
                                            border: IsMatched ? '1.5px solid var(--success-color)' : (IsSelected ? '1.5px solid var(--primary-color)' : '1px solid var(--glass-border)'),
                                            marginBottom: '8px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <div
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                                <div
                                                    style={{ padding: '4px' }}
                                                    onClick={(e) => { e.stopPropagation(); toggleExpand(t.id, e); }}
                                                >
                                                    {expandedIds.includes(t.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                </div>
                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: 'bold',
                                                    color: IsMatched ? 'var(--success-color)' : 'var(--text-primary)',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {t.name}
                                                </span>
                                            </div>
                                            {IsMatched && <Star size={10} color="var(--success-color)" fill="var(--success-color)" />}
                                        </div>

                                        {expandedIds.includes(t.id) && (
                                            <div style={{ marginTop: '8px', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '1px dashed var(--glass-border)', marginLeft: '10px' }}>
                                                {t.regions && t.regions.length > 0 ? t.regions.map(r => {
                                                    const config = typeConfig[r.type.toLowerCase()] || { label: r.type, color: '#ccc' };
                                                    return (
                                                        <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '4px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: 'var(--text-primary)' }}>
                                                                <span style={{ color: config.color, display: 'flex' }}>{getIcon(r.type)}</span>
                                                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '500' }}>
                                                                    {r.label || config.label}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                }) : (
                                                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>无定义要素</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            }) : <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>暂无已存模板</p>}
                        </div>
                    </div>
                </>
            )}
        </aside>
    );
};

export default LeftPanel;
