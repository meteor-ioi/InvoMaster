import React from 'react';

const DataPreview = ({ tableRefining, regions = [], isSplit = false, typeConfig = {}, loading = false }) => {
    // 如果是表格微调模式
    if (tableRefining && tableRefining.preview) {
        return (
            <div style={{
                marginTop: isSplit ? '0' : '20px',
                borderTop: isSplit ? 'none' : '1px solid var(--glass-border)',
                paddingTop: isSplit ? '0' : '20px',
                padding: isSplit ? '15px' : '0',
                position: 'relative'
            }}>
                {loading && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(2px)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>
                        <div className="loading-spinner-small" />
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ fontSize: '13px', margin: 0, color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                        {isSplit ? '实时数据预览' : '实时数据提取 (单元格级预览):'}
                    </h4>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {isSplit ? `${tableRefining.cells?.length || 0} 单元格` : `共探测到 ${tableRefining.cells?.length || 0} 个物理单元格`}
                    </span>
                </div>
                <div style={{ width: '100%', overflowX: 'auto', background: isSplit ? 'transparent' : 'var(--input-bg)', borderRadius: '12px', padding: isSplit ? '0' : '15px', border: isSplit ? 'none' : '1px solid var(--glass-border)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                        <tbody>
                            {tableRefining.preview.map((row, ridx) => (
                                <tr key={ridx} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                    {row.map((cell, cidx) => (
                                        <td key={cidx} style={{ padding: '6px 10px', color: 'var(--text-primary)', whiteSpace: 'nowrap', borderRight: '1px solid var(--glass-border)' }}>{cell || '-'}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
                    {regions.map((region, idx) => (
                        <div key={region.id || idx} style={{
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '12px',
                            border: '1px solid var(--glass-border)',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
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
                                {/* 移除右侧冗余展示的 Label 信息 */}
                            </div>

                            <div style={{
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: '8px',
                                padding: '10px',
                                fontSize: '13px',
                                color: 'var(--text-primary)',
                                lineHeight: '1.6',
                                overflowX: 'auto'
                            }}>
                                {region.type === 'table' && Array.isArray(region.content) ? (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                        <tbody>
                                            {region.content.map((row, ridx) => (
                                                <tr key={ridx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    {Array.isArray(row) && row.map((cell, cidx) => (
                                                        <td key={cidx} style={{ padding: '6px 8px', color: 'var(--text-primary)', whiteSpace: 'nowrap', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                                                            {cell || '-'}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                        {region.content || region.text || <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>无文本内容，请点击数据预览执行提取</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
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
