import React from 'react';
import { Layout, Star, ChevronLeft, ChevronRight, Edit3, Upload, Plus } from 'lucide-react';

const LeftPanel = ({
    collapsed,
    setCollapsed,
    templates,
    sortedTemplates,
    analysis,
    onEditTemplate,
    onFileUpload,
    loading
}) => {
    return (
        <aside
            className="glass-card"
            style={{
                width: collapsed ? '96px' : '260px',
                minWidth: collapsed ? '96px' : '260px',
                padding: collapsed ? '10px' : '15px',
                position: 'sticky',
                top: '80px',
                transition: 'all 0.3s ease',
                overflow: 'hidden',
                zIndex: 90,
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* Collapse Toggle - Centered on the right edge */}
            <div
                style={{
                    position: 'absolute',
                    right: '0px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '20px',
                    height: '40px',
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    borderRight: 'none',
                    borderRadius: '8px 0 0 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    zIndex: 100,
                    boxShadow: '-2px 0 10px rgba(0,0,0,0.1)'
                }}
                onClick={() => setCollapsed(!collapsed)}
            >
                {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </div>

            {/* Upload Area */}
            <div style={{ marginBottom: collapsed ? '0px' : '20px', textAlign: 'center' }}>
                {!collapsed && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', textAlign: 'left', fontWeight: 'bold' }}>
                        载入新文档
                    </div>
                )}
                <div
                    onClick={() => !loading && document.getElementById('panel-file-input').click()}
                    style={{
                        padding: collapsed ? '0px' : '15px',
                        height: collapsed ? '64px' : 'auto',
                        borderRadius: '12px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: collapsed ? 'none' : '1px dashed var(--primary-color)',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.3s ease'
                    }}
                >
                    <Upload size={collapsed ? 24 : 24} color="var(--primary-color)" className={loading ? 'animate-spin' : ''} />
                    {!collapsed && <span style={{ fontSize: '11px', color: 'var(--primary-color)', fontWeight: 'bold' }}>上传 PDF 单据</span>}
                    <input
                        type="file"
                        id="panel-file-input"
                        className="hidden"
                        accept="application/pdf"
                        onChange={onFileUpload}
                    />
                </div>
            </div>

            <div style={{ height: '1px', background: 'var(--glass-border)', margin: '10px 0' }} />

            {/* Template List Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: collapsed ? '0px' : '10px',
                justifyContent: 'center',
                height: collapsed ? '64px' : 'auto'
            }}>
                <Layout size={collapsed ? 24 : 16} color="var(--primary-color)" />
                {!collapsed && <span style={{ fontSize: '13px', fontWeight: 'bold' }}>已存模板 ({templates.length})</span>}
            </div>

            {!collapsed && (
                <div style={{ maxHeight: 'calc(100vh - 350px)', overflowY: 'auto', paddingRight: '5px' }} className="custom-scrollbar">
                    {sortedTemplates.length > 0 ? sortedTemplates.map(t => {
                        const IsMatched = analysis && t.fingerprint === analysis.fingerprint;
                        return (
                            <div key={t.id} className={IsMatched ? 'matched-scan-effect' : ''} style={{ padding: '8px', borderRadius: '6px', background: IsMatched ? 'rgba(16, 185, 129, 0.05)' : 'var(--input-bg)', border: IsMatched ? '1px solid var(--success-color)' : '1px solid var(--glass-border)', marginBottom: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: IsMatched ? 'var(--success-color)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{t.name}</span>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        {IsMatched && <Star size={10} color="var(--success-color)" fill="var(--success-color)" />}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onEditTemplate(t); }}
                                            title="编辑此模板"
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: 0.6, transition: 'opacity 0.2s' }}
                                            onMouseEnter={e => e.target.style.opacity = 1}
                                            onMouseLeave={e => e.target.style.opacity = 0.6}
                                        >
                                            <Edit3 size={12} color="var(--accent-color)" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    }) : <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', padding: '10px' }}>暂无模板</p>}
                </div>
            )}
        </aside>
    );
};

export default LeftPanel;
