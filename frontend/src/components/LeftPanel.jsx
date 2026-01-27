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
    templateMode,
    setTemplateMode,
    typeConfig = TYPE_CONFIG,
    headerCollapsed = false
}) => {
    const [expandedIds, setExpandedIds] = useState([]);
    const [dragActive, setDragActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
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
                width: collapsed ? '64px' : '300px',
                minWidth: collapsed ? '64px' : '300px',
                position: 'sticky',
                top: '20px',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                height: headerCollapsed ? 'calc(100vh - 76px)' : 'calc(100vh - 100px)',
                alignItems: 'flex-start'
            }}
        >
            {/* 悬浮切换按钮 (右边缘居中) */}
            <div
                style={{
                    position: 'absolute',
                    right: '-20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 100,
                    cursor: 'pointer',
                    opacity: isHoveringToggle ? 0.7 : 0.5,
                    transition: 'all 0.3s ease'
                }}
                onMouseEnter={() => setIsHoveringToggle(true)}
                onMouseLeave={() => setIsHoveringToggle(false)}
                onClick={() => setCollapsed(!collapsed)}
            >
                <div style={{
                    width: '20px',
                    height: '48px',
                    background: 'transparent',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-primary)'
                }}>
                    {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </div>
            </div>

            {collapsed ? (
                <div className="glass-card" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '20px 0', borderRadius: '16px' }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary-color)'
                    }}>
                        <Layout size={20} />
                    </div>

                    <button
                        onClick={() => document.getElementById('panel-file-upload').click()}
                        style={{ width: '44px', height: '44px', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--primary-color)', transition: 'all 0.2s' }}
                        title="上传文件"
                    >
                        <Upload size={22} />
                    </button>

                    <button
                        onClick={() => setCollapsed(false)}
                        style={{ width: '44px', height: '44px', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--primary-color)', transition: 'all 0.2s' }}
                        title="模板仓库"
                    >
                        <Package size={22} />
                    </button>

                    <input id="panel-file-upload" type="file" className="hidden" onChange={handleFileSelect} />
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
                            width: '100%',
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
                                {dragActive ? '松开即刻上传' : '添加文件'}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                支持 PDF 或图片格式
                            </span>
                        </div>
                        <input
                            id="panel-file-upload"
                            type="file"
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                    </div>

                    {/* 卡片 2: 模板列表 */}
                    <div
                        className="glass-card"
                        style={{
                            width: '100%',
                            flex: 1,
                            padding: '15px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            overflow: 'hidden',
                            borderRadius: '16px'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Package size={16} color="var(--primary-color)" />
                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)' }}>模板仓库</span>
                            </div>
                        </div>

                        {/* 模式切换栏 (移动至卡片内容中) */}
                        <div style={{ display: 'flex', gap: '2px', background: 'var(--input-bg)', padding: '2px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                            <button
                                onClick={(e) => { e.stopPropagation(); setTemplateMode('auto'); }}
                                title="标准模式"
                                style={{
                                    flex: 1,
                                    padding: '6px 8px', border: 'none', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', transition: 'all 0.3s',
                                    background: templateMode === 'auto' ? 'var(--primary-color)' : 'transparent',
                                    color: templateMode === 'auto' ? '#fff' : 'var(--text-secondary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                }}
                            >
                                <Sparkles size={12} /> 标准模式
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setTemplateMode('custom'); }}
                                title="自定义模式"
                                style={{
                                    flex: 1,
                                    padding: '6px 8px', border: 'none', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', transition: 'all 0.3s',
                                    background: templateMode === 'custom' ? 'var(--accent-color)' : 'transparent',
                                    color: templateMode === 'custom' ? '#fff' : 'var(--text-secondary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                }}
                            >
                                <User size={12} /> 自定义模式
                            </button>
                        </div>

                        {/* 常驻搜索框区域 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', paddingLeft: '4px', opacity: 0.8 }}>模板搜索</div>
                            <div style={{ position: 'relative' }}>
                                <Search
                                    size={14}
                                    color="var(--text-secondary)"
                                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}
                                />
                                <input
                                    type="text"
                                    placeholder="搜索模板名称或ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px 8px 32px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--glass-border)',
                                        background: 'var(--input-bg)',
                                        color: 'var(--text-primary)',
                                        fontSize: '12px',
                                        outline: 'none',
                                        transition: 'all 0.2s'
                                    }}
                                    onFocus={(e) => e.target.style.border = `1px solid var(--${templateMode === 'custom' ? 'accent' : 'primary'}-color)`}
                                    onBlur={(e) => e.target.style.border = '1px solid var(--glass-border)'}
                                />
                                {searchQuery && (
                                    <X
                                        size={14}
                                        color="var(--text-secondary)"
                                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.6 }}
                                        onClick={() => setSearchQuery('')}
                                    />
                                )}
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: 'hidden', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', paddingLeft: '4px', opacity: 0.8 }}>模型列表</div>
                            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '2px' }} className="custom-scrollbar">
                                {(() => {
                                    // Filter logic
                                    const filtered = templates.filter(t => {
                                        const matchMode = t.mode === templateMode;
                                        const matchSearch = !searchQuery ||
                                            t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
                                                            background: IsMatched ? 'rgba(16, 185, 129, 0.12)' : (IsSelected ? (templateMode === 'custom' ? 'rgba(124, 58, 237, 0.08)' : 'rgba(59, 130, 246, 0.08)') : 'var(--input-bg)'),
                                                            border: IsMatched ? '2px solid var(--success-color)' : (IsSelected ? (templateMode === 'custom' ? '2px solid var(--accent-color)' : '2px solid var(--primary-color)') : '1px solid var(--glass-border)'),
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
                                                                    className="fold-icon"
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
                    </div>
                </>
            )}
        </aside >
    );
};

export default LeftPanel;
