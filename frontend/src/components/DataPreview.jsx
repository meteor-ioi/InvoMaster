import React from 'react';

const DataPreview = ({ theme, tableRefining, regions = [], isSplit = false, typeConfig = {}, loading = false }) => {
    // 如果是表格微调模式
    if (tableRefining && tableRefining.preview) {
        const isDark = theme === 'dark';
        const cardBg = isDark ? 'var(--glass-bg)' : 'transparent';
        const tableBg = isDark ? 'rgba(0,0,0,0.2)' : 'transparent';

        return (
            <div style={{
                marginTop: isSplit ? '0' : '20px',
                borderTop: isSplit ? 'none' : '1px solid var(--glass-border)',
                paddingTop: isSplit ? '0' : '20px',
                padding: isSplit ? '15px' : '0',
                position: 'relative',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {loading && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(2px)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>
                        <div className="loading-spinner-small" />
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '13px', margin: 0, color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                        {isSplit ? '实时数据预览' : '实时数据提取 (单元格级预览):'}
                    </h4>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {isSplit ? `${tableRefining.cells?.length || 0} 单元格` : `共探测到 ${tableRefining.cells?.length || 0} 个物理单元格`}
                    </span>
                </div>
                <div style={{
                    flex: 1,
                    minHeight: 0,
                    overflow: 'auto',
                    background: cardBg,
                    borderRadius: '12px',
                    padding: isDark ? '8px' : '0',
                    border: isDark ? '1px solid var(--glass-border)' : 'none',
                    boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.03)' : 'none'
                }} className="custom-scrollbar">
                    <div style={{
                        border: '1px solid var(--glass-border)',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        background: tableBg,
                        width: 'fit-content',
                        minWidth: '100%'
                    }}>
                        <table style={{ borderCollapse: 'collapse', fontSize: '11px', width: '100%' }}>
                            <tbody>
                                {tableRefining.preview.map((row, ridx) => (
                                    <tr key={ridx} style={{
                                        borderBottom: '1px solid var(--glass-border)',
                                        background: ridx % 2 === 0 ? 'transparent' : (theme === 'light' ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.02)')
                                    }}>
                                        {row.map((cell, cidx) => (
                                            <td key={cidx} style={{
                                                padding: '8px 12px',
                                                color: 'var(--text-primary)',
                                                whiteSpace: 'nowrap',
                                                borderRight: '1px solid var(--glass-border)'
                                            }}>
                                                {cell || '-'}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    // 如果是版面分析预览模式
    if (!tableRefining && (regions.length > 0 || loading)) {
        return (
            <div style={{
                padding: isSplit ? '15px' : '20px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                position: 'relative'
            }}>
                {loading && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(2px)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px' }}>
                        <div className="loading-spinner-small" />
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '13px', margin: 0, color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                        要素实时提取预览 ({regions.length})
                    </h4>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }} className="custom-scrollbar">
                    {regions.map((region, idx) => {
                        const isDark = theme === 'dark';
                        const cardBg = isDark ? 'var(--glass-bg)' : 'var(--input-bg)';
                        const previewBg = isDark ? 'rgba(0,0,0,0.2)' : 'transparent';
                        return (
                            <div key={region.id || idx} style={{
                                background: cardBg,
                                borderRadius: '16px',
                                border: '1px solid var(--glass-border)',
                                padding: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{
                                            fontSize: '10px',
                                            background: 'var(--primary-color)',
                                            color: 'white',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            fontWeight: 'bold'
                                        }}>{region.id}</span>
                                        <span style={{
                                            fontSize: '11px',
                                            color: typeConfig[region.type]?.color || 'var(--text-primary)',
                                            fontWeight: 'bold'
                                        }}>
                                            {typeConfig[region.type]?.label || region.type}
                                        </span>
                                    </div>
                                </div>

                                <div style={{
                                    background: previewBg,
                                    borderRadius: '12px',
                                    padding: '12px',
                                    fontSize: '13px',
                                    color: 'var(--text-primary)',
                                    lineHeight: '1.6',
                                    overflow: 'auto',
                                    border: isDark ? '1px solid var(--glass-border)' : 'none'
                                }} className="custom-scrollbar">
                                    {region.type === 'table' && Array.isArray(region.content) ? (
                                        <div style={{
                                            borderRadius: '6px',
                                            overflow: 'hidden',
                                            border: '1px solid var(--glass-border)',
                                            width: 'fit-content',
                                            minWidth: '100%'
                                        }}>
                                            <table style={{ borderCollapse: 'collapse', fontSize: '11px', width: '100%' }}>
                                                <tbody>
                                                    {region.content.map((row, ridx) => (
                                                        <tr key={ridx} style={{
                                                            borderBottom: '1px solid var(--glass-border)',
                                                            background: ridx % 2 === 0 ? 'transparent' : (theme === 'light' ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.02)')
                                                        }}>
                                                            {Array.isArray(row) && row.map((cell, cidx) => (
                                                                <td key={cidx} style={{
                                                                    padding: '8px 12px',
                                                                    color: 'var(--text-primary)',
                                                                    whiteSpace: 'nowrap',
                                                                    borderRight: '1px solid var(--glass-border)'
                                                                }}>
                                                                    {cell || '-'}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                            {region.content || region.text || <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>无文本内容，请点击数据预览执行提取</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', color: 'var(--text-secondary)', textAlign: 'center' }}>
            <p>请点击顶栏工具栏“数据预览”按钮<br />并选中要素以展示提取内容</p>
        </div>
    );
};

export default DataPreview;
