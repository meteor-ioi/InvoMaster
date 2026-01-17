import React from 'react';
import { Zap, RefreshCw, Minus, Plus, Filter, Eye, EyeOff, HelpCircle, Info, Hash, Table } from 'lucide-react';

const TopToolbar = ({
    tableRefining,
    layoutSettings,
    applyStrategy,
    setLayoutSettings,
    confidence,
    setConfidence,
    analyze,
    file,
    loading,
    zoom,
    setZoom,
    viewFilters,
    setViewFilters,
    showRegions,
    setShowRegions,
    typeConfig,
    isIntegrated = false
}) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isIntegrated ? '0' : '10px' }}>
            {/* Layer 1: Identification Settings */}
            {!tableRefining && (
                <div className={isIntegrated ? "" : "glass-card"} style={{
                    padding: '12px 20px',
                    borderBottom: '1px solid var(--glass-border)',
                    overflow: 'hidden',
                    background: isIntegrated ? 'rgba(255,255,255,0.03)' : ''
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1, minWidth: 0 }}>
                            {/* Strategy Toggle */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                                <Zap size={16} color="var(--primary-color)" />
                                <span style={{ fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>识别策略:</span>
                                <div className="strategy-toggle" style={{ display: 'flex', background: 'var(--input-bg)', padding: '3px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                    {['fast', 'balanced', 'precise'].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => applyStrategy(s)}
                                            style={{
                                                padding: '4px 12px', borderRadius: '6px', fontSize: '11px', border: 'none', cursor: 'pointer',
                                                background: layoutSettings.strategy === s ? 'var(--primary-color)' : 'transparent',
                                                color: layoutSettings.strategy === s ? '#fff' : 'var(--text-secondary)',
                                                fontWeight: layoutSettings.strategy === s ? 'bold' : 'normal',
                                                transition: 'all 0.2s', whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {s === 'fast' ? '极速' : s === 'balanced' ? '平衡' : '精细'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Parameters Area */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', paddingLeft: '20px', borderLeft: '1px solid var(--glass-border)', flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>分辨率:</span>
                                    <select
                                        value={layoutSettings.imgsz}
                                        onChange={(e) => setLayoutSettings({ ...layoutSettings, imgsz: parseInt(e.target.value), strategy: 'custom' })}
                                        style={{ background: 'var(--input-bg)', border: '1px solid var(--glass-border)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '11px', outline: 'none' }}
                                    >
                                        {[640, 800, 1024, 1280, 1600, 2048].map(size => <option key={size} value={size}>{size}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '150px' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>置信度:</span>
                                    <input
                                        type="range" min="0.05" max="0.6" step="0.05"
                                        value={confidence} onChange={(e) => setConfidence(parseFloat(e.target.value))}
                                        style={{ flex: 1, minWidth: '80px', maxWidth: '300px', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: '11px', minWidth: '30px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{confidence.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => analyze(file, { refresh: true })}
                            disabled={loading}
                            className="btn-primary"
                            style={{ padding: '8px 20px', fontSize: '12px', background: 'var(--accent-color)', whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 重新分析
                        </button>
                    </div>
                </div>
            )}

            {/* Layer 2: View Tools - Always visible */}
            <div className={isIntegrated ? "" : "glass-card"} style={{
                padding: '10px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: isIntegrated ? '1px solid var(--glass-border)' : 'none',
                background: isIntegrated ? 'rgba(255,255,255,0.02)' : ''
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--input-bg)', padding: '2px 8px', borderRadius: '6px' }}>
                        <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><Minus size={14} /></button>
                        <span style={{ fontSize: '12px', minWidth: '35px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(z => Math.min(2.0, z + 0.1))} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><Plus size={14} /></button>
                        <button onClick={() => {
                            if (zoom < 1.49) setZoom(1.5);
                            else if (zoom < 1.99) setZoom(2.0);
                            else setZoom(1.0);
                        }} style={{ fontSize: '10px', background: 'var(--glass-border)', border: 'none', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-primary)', marginLeft: '4px' }}>自适应</button>
                    </div>
                    {!tableRefining && (
                        <>
                            <div style={{ height: '16px', width: '1px', background: 'var(--glass-border)' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Filter size={14} color="var(--text-secondary)" />
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>仅查看:</span>
                                {['table', 'title', 'figure', 'plain text'].map(type => (
                                    <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '11px' }}>
                                        <input
                                            type="checkbox"
                                            checked={!!viewFilters[type]}
                                            onChange={(e) => setViewFilters({ ...viewFilters, [type]: e.target.checked })}
                                            style={{ accentColor: 'var(--success-color)' }}
                                        />
                                        {typeConfig[type]?.label || type}
                                    </label>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {/* Middle Section: Stats (Only in Table Refining) */}
                    {tableRefining && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '0 20px', borderLeft: '1px solid var(--glass-border)', borderRight: '1px solid var(--glass-border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Table size={14} color="var(--primary-color)" />
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>结构统计:</span>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                    {(tableRefining.rows?.length || 1) - 1} 行
                                </span>
                                <span style={{ color: 'var(--glass-border)', margin: '0 4px' }}>|</span>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                    {(tableRefining.cols?.length || 1) - 1} 列
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', background: 'rgba(59, 130, 246, 0.05)', padding: '2px 10px', borderRadius: '20px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                                <Info size={12} color="var(--primary-color)" />
                                <span style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                                    提示: 拖拽线段移动，边缘悬停可新增
                                </span>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <button
                            onClick={() => setShowRegions(!showRegions)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px',
                                borderRadius: '6px', border: '1px solid var(--glass-border)',
                                background: 'transparent', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer'
                            }}
                        >
                            {showRegions ? <Eye size={12} /> : <EyeOff size={12} />}
                            {showRegions ? '隐藏预览' : '显示预览'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TopToolbar;
