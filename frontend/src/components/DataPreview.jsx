import React from 'react';

const DataPreview = ({ tableRefining }) => {
    if (!tableRefining || !tableRefining.preview) return null;

    return (
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
    );
};

export default DataPreview;
