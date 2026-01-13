import React from 'react';
import { Layout, Star, ChevronLeft, ChevronRight } from 'lucide-react';

const LeftPanel = ({
    collapsed,
    setCollapsed,
    templates,
    sortedTemplates,
    analysis
}) => {
    return (
        <aside
            className="glass-card"
            style={{
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
    );
};

export default LeftPanel;
