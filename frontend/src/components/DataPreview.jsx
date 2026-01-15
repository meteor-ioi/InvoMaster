import React from 'react';

const DataPreview = ({ tableRefining }) => {
    if (!tableRefining || !tableRefining.preview) return null;

    const markdown = tableRefining.preview.map(row =>
        `| ${row.map(cell => (cell || '').replace(/\|/g, '\\|')).join(' | ')} |`
    ).join('\n');

    return (
        <div style={{ marginTop: '20px', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ fontSize: '14px', margin: 0, color: 'var(--text-secondary)' }}>实时数据提取 (单元格级预览):</h4>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>共探测到 {tableRefining.cells?.length || 0} 个物理单元格</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* HTML Table Preview */}
                <div style={{ width: '100%', overflowX: 'auto', background: 'var(--input-bg)', borderRadius: '12px', padding: '15px', border: '1px solid var(--glass-border)' }}>
                    <h5 style={{ margin: '0 0 10px 0', fontSize: '12px', color: 'var(--primary-color)' }}>HTML Preview</h5>
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

                {/* Markdown Source Preview */}
                <div style={{ width: '100%', overflow: 'hidden', background: '#1e1e1e', borderRadius: '12px', padding: '15px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column' }}>
                    <h5 style={{ margin: '0 0 10px 0', fontSize: '12px', color: 'var(--accent-color)' }}>Markdown Source</h5>
                    <textarea
                        readOnly
                        value={markdown}
                        style={{
                            width: '100%', flex: 1, background: 'transparent', border: 'none',
                            color: '#d4d4d4', fontFamily: 'monospace', fontSize: '11px', resize: 'none',
                            whiteSpace: 'pre'
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default DataPreview;
