import React from 'react';
import { Layout, Star, ChevronLeft, ChevronRight, ChevronDown, Hash, Grid, FileText, Ban, Layers, ArrowRight } from 'lucide-react';
import { TYPE_CONFIG } from './DocumentEditor';

const LeftPanel = ({
    collapsed,
    setCollapsed,
    templates,
    sortedTemplates,
    analysis,
    typeConfig = TYPE_CONFIG
}) => {
    const [expandedIds, setExpandedIds] = React.useState([]);

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

    return (
        <aside
            className="glass-card"
            style={{
                width: collapsed ? '40px' : '260px',
                minWidth: collapsed ? '40px' : '260px',
                padding: collapsed ? '10px' : '15px',
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
                    justifyContent: collapsed ? 'center' : 'space-between',
                    cursor: 'pointer',
                    marginBottom: collapsed ? 0 : '10px',
                    paddingBottom: collapsed ? 0 : '10px',
                    borderBottom: collapsed ? 'none' : '1px solid var(--glass-border)'
                }}
                onClick={() => setCollapsed(!collapsed)}
            >
                {!collapsed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Layout size={16} color="var(--primary-color)" />
                        <span style={{ fontSize: '13px', fontWeight: 'bold' }}>已存模板 ({templates.length})</span>
                    </div>
                )}
                {collapsed ? (
                    <ChevronRight size={18} color="var(--text-secondary)" />
                ) : (
                    <ChevronLeft size={18} color="var(--text-secondary)" />
                )}
            </div>

            {!collapsed && (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }} className="custom-scrollbar">
                    {sortedTemplates.length > 0 ? sortedTemplates.map(t => {
                        const IsMatched = analysis && t.fingerprint === analysis.fingerprint;
                        return (
                            <div
                                key={t.id}
                                className={IsMatched ? 'matched-scan-effect' : ''}
                                style={{
                                    padding: '8px',
                                    borderRadius: '6px',
                                    background: IsMatched ? 'rgba(16, 185, 129, 0.05)' : 'var(--input-bg)',
                                    border: IsMatched ? '1px solid var(--success-color)' : '1px solid var(--glass-border)',
                                    marginBottom: '6px',
                                    cursor: 'default'
                                }}
                            >
                                <div
                                    onClick={(e) => toggleExpand(t.id, e)}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                        {expandedIds.includes(t.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
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
                                    <div style={{ marginTop: '8px', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '1px dashed var(--glass-border)', marginLeft: '5px' }}>
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
                                                    <div style={{ fontSize: '9px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px', paddingLeft: '15px', opacity: 0.8 }}>
                                                        <span>范围:</span>
                                                        <span>({Math.round(r.x * 100)},{Math.round(r.y * 100)})</span>
                                                        <ArrowRight size={8} />
                                                        <span>({Math.round((r.x + r.width) * 100)},{Math.round((r.y + r.height) * 100)})</span>
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
                    }) : <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', padding: '10px' }}>暂无模板</p>}
                </div>
            )}
        </aside>
    );
};

export default LeftPanel;
