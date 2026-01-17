import React from 'react';

const DataPreview = ({ tableRefining, isSplit = false }) => {
    if (!tableRefining || !tableRefining.preview) return null;

    return (
        <div style={{
            marginTop: isSplit ? '0' : '20px',
            borderTop: isSplit ? 'none' : '1px solid var(--glass-border)',
            paddingTop: isSplit ? '0' : '20px',
            padding: isSplit ? '15px' : '0'
        }}>
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
};

export default DataPreview;
