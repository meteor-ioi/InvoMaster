import React, { useState } from 'react';
import { Layout, ChevronLeft, ChevronRight, ChevronDown, Hash, Grid, FileText, Ban, Layers, ArrowRight, Plus, Upload, Search, X, Copy, Trash2, Sparkles, User, Package } from 'lucide-react';
import { TYPE_CONFIG } from './DocumentEditor';

const LeftPanel = ({
    collapsed,
    setCollapsed,
    templates,
    analysis,
    onAnalyze,
    onSelectTemplate,
    onDeleteTemplate,
    setToast,
    typeConfig = TYPE_CONFIG,
    headerCollapsed = false
}) => {
    const [expandedIds, setExpandedIds] = useState([]);
    const [dragActive, setDragActive] = useState(false);
    const [activeTab, setActiveTab] = useState('auto');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [showSearch, setShowSearch] = useState(false);
    const [isHoveringToggle, setIsHoveringToggle] = useState(false);

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
                width: collapsed ? '64px' : '260px',
                minWidth: collapsed ? '64px' : '260px',
                position: 'sticky',
                top: '20px',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                height: headerCollapsed ? 'calc(100vh - 76px)' : 'calc(100vh - 100px)',
            }}
        >
            {/* 悬浮切换按钮 (右边缘居中) */}
            <div
                style={{
                    position: 'absolute',
                    right: '-12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 100,
                    cursor: 'pointer',
                    opacity: isHoveringToggle ? 1 : 0.6,
                    transition: 'all 0.3s ease'
                }}
                onMouseEnter={() => setIsHoveringToggle(true)}
                onMouseLeave={() => setIsHoveringToggle(false)}
                onClick={() => setCollapsed(!collapsed)}
            >
                <div style={{
                    width: '24px',
                    height: '48px',
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                    color: 'var(--text-primary)'
                }}>
                    {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </div>
            </div>

            {collapsed ? (
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '20px 0', borderRadius: '16px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #3b82f633, #8b5cf633)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--primary-color)'
                    }}>
                        <Layout size={20} />
                    </div>

                    <div style={{ width: '20px', height: '1px', background: 'var(--glass-border)' }} />

                    <button
                        onClick={() => document.getElementById('panel-file-upload').click()}
                        style={{ width: '44px', height: '44px', borderRadius: '50%', border: '1px solid var(--primary-color)', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--primary-color)', transition: 'all 0.2s' }}
                        title="上传 PDF 文件"
                    >
                        <Upload size={20} />
                    </button>

                    <button
                        onClick={() => setCollapsed(false)}
                        style={{ width: '44px', height: '44px', borderRadius: '50%', border: '1px solid var(--accent-color)', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--accent-color)', transition: 'all 0.2s' }}
                        title="模板仓库"
                    >
                        <Package size={20} />
                    </button>

                    <input id="panel-file-upload" type="file" className="hidden" accept="application/pdf" onChange={handleFileSelect} />
                </div>
            ) : (
                <>
                    {/* 展开状态下不再需要顶栏，直接开始内容卡片 */}

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
                            boxShadow: dragActive ? '0 0 15px rgba(59, 130, 246, 0.3)' : 'none',
                            borderRadius: '16px'
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
                            marginBottom: '4px',
                            border: '1px solid rgba(59, 130, 246, 0.2)'
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
                            accept=".pdf,application/pdf"
                            onChange={handleFileSelect}
                        />
                    </div>

                    {/* 卡片 2: 模板列表 */}
                    <div
                        className="glass-card"
                        style={{
                            flex: 1,
                            padding: '15px 12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            overflow: 'hidden',
                            borderRadius: '16px'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '24px' }}>
                            {showSearch ? (
                                <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '8px' }}>
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="搜索模板或标签..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        style={{
                                            flex: 1,
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            border: '1px solid var(--primary-color)',
                                            background: 'var(--input-bg)',
                                            color: 'var(--text-primary)',
                                            fontSize: '11px',
                                            outline: 'none',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                        }}
                                    />
                                    <X
                                        size={14}
                                        color="var(--text-secondary)"
                                        style={{ cursor: 'pointer', flexShrink: 0 }}
                                        onClick={() => {
                                            setShowSearch(false);
                                            setSearchQuery('');
                                        }}
                                    />
                                </div>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Package size={16} color="var(--accent-color)" />
                                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)' }}>模板仓库</span>
                                    </div>
                                    <Search
                                        size={14}
                                        color="var(--text-secondary)"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => setShowSearch(true)}
                                    />
                                </>
                            )}
                        </div>

                        {/* Mode Tabs */}
                        <div style={{ display: 'flex', borderRadius: '10px', background: 'var(--input-bg)', padding: '4px', border: '1px solid var(--glass-border)' }}>
                            <button
                                onClick={() => setActiveTab('auto')}
                                style={{
                                    flex: 1, padding: '8px 0', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: activeTab === 'auto' ? 'bold' : 'normal', cursor: 'pointer', transition: 'all 0.3s',
                                    background: activeTab === 'auto' ? 'var(--primary-color)' : 'transparent',
                                    color: activeTab === 'auto' ? '#fff' : 'var(--text-secondary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                }}
                            >
                                <Sparkles size={12} /> 标准模式
                            </button>
                            <button
                                onClick={() => setActiveTab('custom')}
                                style={{
                                    flex: 1, padding: '8px 0', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: activeTab === 'custom' ? 'bold' : 'normal', cursor: 'pointer', transition: 'all 0.3s',
                                    background: activeTab === 'custom' ? 'var(--accent-color)' : 'transparent',
                                    color: activeTab === 'custom' ? '#fff' : 'var(--text-secondary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                }}
                            >
                                <User size={12} /> 自定义模式
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '2px' }} className="custom-scrollbar">
                            {(() => {
                                // Filter logic
                                const filtered = templates.filter(t => {
                                    const matchMode = t.mode === activeTab;
                                    const matchSearch = !searchQuery ||
                                        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
                                    return matchMode && matchSearch;
                                });

                                if (filtered.length === 0) {
                                    return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5, gap: '10px' }}>
                                        <Package size={24} />
                                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                            {searchQuery ? '未找到相关模板' : `暂无模板`}
                                        </p>
                                    </div>;
                                }

                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        {filtered.map(t => {
                                            const matchedId = analysis?.matched_template?.id;
                                            const IsMatched = analysis && (t.id === matchedId);
                                            const IsSelected = analysis && (t.id === analysis.id || t.id === matchedId);

                                            return (
                                                <div
                                                    key={t.id}
                                                    className={IsMatched ? 'matched-scan-effect' : ''}
                                                    onClick={() => onSelectTemplate && onSelectTemplate(t)}
                                                    style={{
                                                        padding: '10px',
                                                        borderRadius: '10px',
                                                        background: IsMatched ? 'rgba(16, 185, 129, 0.12)' : (IsSelected ? 'rgba(59, 130, 246, 0.08)' : 'var(--input-bg)'),
                                                        border: IsMatched ? '2px solid var(--success-color)' : (IsSelected ? '2px solid var(--primary-color)' : '1px solid var(--glass-border)'),
                                                        marginBottom: '10px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.3s ease'
                                                    }}
                                                >
                                                    <div
                                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                                            <div
                                                                style={{ padding: '2px', color: 'var(--text-secondary)' }}
                                                                onClick={(e) => { e.stopPropagation(); toggleExpand(t.id, e); }}
                                                            >
                                                                {expandedIds.includes(t.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
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
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigator.clipboard.writeText(t.id);
                                                                    if (setToast) {
                                                                        setToast({ type: 'success', text: `已复制模板 ID: ${t.id}` });
                                                                        setTimeout(() => setToast(null), 2000);
                                                                    }
                                                                }}
                                                                title="复制模板 ID"
                                                                style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}
                                                            >
                                                                <Copy size={13} />
                                                            </button>
                                                            {expandedIds.includes(t.id) && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onDeleteTemplate && onDeleteTemplate(t.id);
                                                                    }}
                                                                    title="删除模板"
                                                                    style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#ef4444', display: 'flex' }}
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div style={{ fontSize: '9px', color: 'var(--text-secondary)', paddingLeft: '24px', marginTop: '2px', opacity: 0.7, wordBreak: 'break-all', fontFamily: 'monospace' }}>
                                                        {t.id.slice(0, 8)}...
                                                    </div>


                                                    {/* Tags Display */}
                                                    {t.tags && t.tags.length > 0 && (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px', paddingLeft: '24px' }}>
                                                            {t.tags.map(tag => (
                                                                <span key={tag} style={{
                                                                    fontSize: '9px', padding: '1px 6px', borderRadius: '4px',
                                                                    background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-color)',
                                                                    border: '0.5px solid rgba(59, 130, 246, 0.2)'
                                                                }}>
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {expandedIds.includes(t.id) && (
                                                        <div style={{ marginTop: '10px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '1px solid var(--glass-border)', marginLeft: '10px' }}>
                                                            {t.regions && t.regions.length > 0 ? t.regions.map(r => {
                                                                const config = typeConfig[r.type.toLowerCase()] || { label: r.type, color: '#ccc' };
                                                                return (
                                                                    <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--text-primary)' }}>
                                                                            <span style={{ color: config.color, display: 'flex', opacity: 0.8 }}>{getIcon(r.type)}</span>
                                                                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                                        })}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </>
            )}
        </aside>
    );
};

export default LeftPanel;
