
import React, { useState, useRef, useEffect } from 'react';
import { Zap, RefreshCw, Minus, Plus, Filter, Eye, EyeOff, HelpCircle, Info, Hash, Table, Grid, Check, ChevronDown, Layout, Trash2, PlusSquare, BoxSelect, RotateCcw, RotateCw, Scan } from 'lucide-react';

const TopToolbar = ({
    tableRefining,
    selectedRegion,
    handleEnterTableRefine,
    layoutSettings,
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
    isIntegrated = false,
    showSplitPreview,
    setShowSplitPreview,
    // Add missing props
    editorMode,
    setEditorMode,
    toggleRegionLock,
    deleteRegion,
    clearAllRegions,
    selectedIds,
    setSelectedIds,
    deviceUsed,
    inferenceTime,
    // Undo/Redo Props
    undo,
    redo,
    historyIndex,
    historyLength,
    tableUndo,
    tableRedo,
    tableHistoryIndex,
    tableHistoryLength
}) => {
    const isTableSelected = selectedRegion?.type === 'table';
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef(null);

    // Handle clicking outside of dropdown to close it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filterTypes = ['table', 'title', 'figure', 'plain text', 'custom', 'abandon'];
    const activeFiltersCount = Object.values(viewFilters).filter(Boolean).length;
    // 无筛选状态：空对象或全选
    const isFiltering = activeFiltersCount > 0 && activeFiltersCount < filterTypes.length;

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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                            {/* Smart Dedup Toggle */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                                <Zap size={16} color="var(--primary-color)" />
                                <span style={{ fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>智能去重:</span>
                                <div className="strategy-toggle" style={{ display: 'flex', background: 'var(--input-bg)', padding: '3px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                    {['off', 'moderate', 'aggressive'].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setLayoutSettings({ ...layoutSettings, dedup: s })}
                                            style={{
                                                padding: '4px 12px', borderRadius: '6px', fontSize: '11px', border: 'none', cursor: 'pointer',
                                                background: layoutSettings.dedup === s ? 'var(--primary-color)' : 'transparent',
                                                color: layoutSettings.dedup === s ? '#fff' : 'var(--text-secondary)',
                                                fontWeight: layoutSettings.dedup === s ? 'bold' : 'normal',
                                                transition: 'all 0.2s', whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {s === 'off' ? '关闭' : s === 'moderate' ? '适中' : '激进'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Confidence Slider */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '12px', borderLeft: '1px solid var(--glass-border)', flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '150px' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>置信度:</span>
                                    <button
                                        onClick={() => setConfidence(prev => Math.max(0.05, parseFloat((prev - 0.05).toFixed(2))))}
                                        className="glass-stepper-btn"
                                        title="减少置信度"
                                    >
                                        <Minus size={12} />
                                    </button>
                                    <input
                                        type="range" min="0.05" max="0.6" step="0.05"
                                        value={confidence} onChange={(e) => setConfidence(parseFloat(e.target.value))}
                                        className="glass-slider"
                                        style={{ flex: 1, minWidth: '80px', maxWidth: '300px', cursor: 'pointer' }}
                                    />
                                    <button
                                        onClick={() => setConfidence(prev => Math.min(0.6, parseFloat((prev + 0.05).toFixed(2))))}
                                        className="glass-stepper-btn"
                                        title="增加置信度"
                                    >
                                        <Plus size={12} />
                                    </button>
                                    <span style={{ fontSize: '11px', minWidth: '30px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)', fontWeight: 'bold' }}>{confidence.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => analyze(file, { refresh: true })}
                            disabled={loading}
                            className="btn-primary"
                            style={{ padding: '8px 20px', fontSize: '12px', whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Scan size={14} className={loading ? 'animate-pulse' : ''} /> 版面分析
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '220px' }}>
                    {/* 高精度表格微调入口 - 移至最左侧 */}
                    {!tableRefining && (
                        <>
                            <button
                                onClick={() => setShowSplitPreview(!showSplitPreview)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '5px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid',
                                    borderColor: showSplitPreview ? 'var(--primary-color)' : 'var(--glass-border)',
                                    background: showSplitPreview ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                    color: showSplitPreview ? 'var(--primary-color)' : 'var(--text-secondary)',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    marginRight: '5px'
                                }}
                            >
                                <Layout size={14} />
                                {showSplitPreview ? '收起预览' : '数据预览'}
                            </button>

                            <div style={{ position: 'relative' }} ref={filterRef}>
                                <button
                                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '5px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--glass-border)',
                                        background: isFilterOpen ? 'rgba(255,255,255,0.1)' : 'transparent',
                                        color: 'var(--text-secondary)',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        outline: 'none'
                                    }}
                                >
                                    <Filter
                                        size={14}
                                        color={isFiltering ? "var(--primary-color)" : "var(--text-secondary)"}
                                        fill={isFiltering ? "var(--primary-color)" : "none"}
                                        opacity={isFiltering ? 1 : 0.6}
                                    />
                                    <span style={{
                                        fontWeight: '500',
                                        color: isFiltering ? 'var(--primary-color)' : 'var(--text-secondary)'
                                    }}>仅查看</span>
                                    <ChevronDown size={12} style={{ transform: isFilterOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
                                </button>

                                {isFilterOpen && (
                                    <div className="glass-card" style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 8px)',
                                        left: 0,
                                        zIndex: 1000,
                                        minWidth: '180px',
                                        padding: '8px',
                                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
                                        border: '1px solid var(--glass-border)',
                                        animation: 'fadeIn 0.2s ease-out'
                                    }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            {filterTypes.map(type => (
                                                <div
                                                    key={type}
                                                    onClick={() => setViewFilters({ ...viewFilters, [type]: !viewFilters[type] })}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '8px 10px',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        background: viewFilters[type] ? 'rgba(255,255,255,0.05)' : 'transparent',
                                                        transition: 'all 0.2s',
                                                        userSelect: 'none'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = viewFilters[type] ? 'rgba(255,255,255,0.05)' : 'transparent'}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{
                                                            width: '16px',
                                                            height: '16px',
                                                            borderRadius: '4px',
                                                            border: '1.5px solid',
                                                            borderColor: viewFilters[type] ? 'var(--success-color)' : 'var(--glass-border)',
                                                            background: viewFilters[type] ? 'var(--success-color)' : 'transparent',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.2s'
                                                        }}>
                                                            {viewFilters[type] && <Check size={12} color="#fff" strokeWidth={3} />}
                                                        </div>
                                                        <span style={{ fontSize: '13px', color: viewFilters[type] ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                                            {typeConfig[type]?.label || type}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div style={{
                                            marginTop: '8px',
                                            paddingTop: '8px',
                                            borderTop: '1px solid var(--glass-border)',
                                            display: 'flex',
                                            justifyContent: 'center'
                                        }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const allChecked = activeFiltersCount < filterTypes.length;
                                                    const nextFilters = {};
                                                    filterTypes.forEach(t => nextFilters[t] = allChecked);
                                                    setViewFilters(nextFilters);
                                                }}
                                                style={{
                                                    fontSize: '11px',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'var(--primary-color)',
                                                    cursor: 'pointer',
                                                    padding: '4px 10px',
                                                    borderRadius: '4px'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                {activeFiltersCount === filterTypes.length ? '全部取消' : '一键全选'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {tableRefining && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <button
                                onClick={() => setShowSplitPreview(!showSplitPreview)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '5px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid',
                                    borderColor: showSplitPreview ? 'var(--primary-color)' : 'var(--glass-border)',
                                    background: showSplitPreview ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                    color: showSplitPreview ? 'var(--primary-color)' : 'var(--text-secondary)',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    marginRight: '5px'
                                }}
                            >
                                <Layout size={14} />
                                {showSplitPreview ? '收起预览' : '数据预览'}
                            </button>

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
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, justifyContent: 'center' }}>
                    {/* Central Editing Tools */}
                    {tableRefining ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button
                                onClick={() => tableUndo()}
                                disabled={!tableUndo || tableHistoryIndex <= 0}
                                title="撤回表格操作"
                                style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--input-bg)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: tableHistoryIndex > 0 ? 'pointer' : 'not-allowed', opacity: tableHistoryIndex > 0 ? 1 : 0.5 }}
                            >
                                <RotateCcw size={14} />
                            </button>
                            <button
                                onClick={() => tableRedo()}
                                disabled={!tableRedo || tableHistoryIndex >= tableHistoryLength - 1}
                                title="重做表格操作"
                                style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--input-bg)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: tableHistoryIndex < tableHistoryLength - 1 ? 'pointer' : 'not-allowed', opacity: tableHistoryIndex < tableHistoryLength - 1 ? 1 : 0.5 }}
                            >
                                <RotateCw size={14} />
                            </button>
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px'
                        }}>
                            <button
                                onClick={() => undo && undo()}
                                disabled={!undo || historyIndex <= 0}
                                title="撤回"
                                style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: 'transparent', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: historyIndex > 0 ? 'pointer' : 'not-allowed', opacity: historyIndex > 0 ? 1 : 0.5 }}
                            >
                                <RotateCcw size={16} />
                            </button>
                            <button
                                onClick={() => redo && redo()}
                                disabled={!redo || historyIndex >= historyLength - 1}
                                title="重做"
                                style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: 'transparent', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: historyIndex < historyLength - 1 ? 'pointer' : 'not-allowed', opacity: historyIndex < historyLength - 1 ? 1 : 0.5 }}
                            >
                                <RotateCw size={16} />
                            </button>

                            <button
                                onClick={() => toggleRegionLock(selectedRegion?.id)}
                                disabled={!selectedRegion}
                                title={selectedRegion?.locked ? "解锁当前区块" : "锁定当前区块"}
                                style={{
                                    width: '32px', height: '32px', borderRadius: '8px', border: 'none',
                                    background: selectedRegion?.locked ? 'var(--accent-color)' : 'transparent',
                                    color: selectedRegion?.locked ? '#fff' : 'var(--text-secondary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: selectedRegion ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.2s',
                                    opacity: selectedRegion ? 1 : 0.5
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    {selectedRegion?.locked ? (
                                        <>
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </>
                                    ) : (
                                        <>
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                                        </>
                                    )}
                                </svg>
                            </button>
                            <button
                                onClick={() => setEditorMode(editorMode === 'add' ? 'view' : 'add')}
                                title="新增区块"
                                style={{
                                    width: '32px', height: '32px', borderRadius: '8px', border: 'none',
                                    background: editorMode === 'add' ? 'var(--primary-color)' : 'transparent',
                                    color: editorMode === 'add' ? '#fff' : 'var(--text-secondary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <PlusSquare size={16} />
                            </button>
                            <button
                                onClick={() => setEditorMode(editorMode === 'select' ? 'view' : 'select')}
                                title="选择区域 (批量操作)"
                                style={{
                                    width: '32px', height: '32px', borderRadius: '8px', border: 'none',
                                    background: editorMode === 'select' ? 'var(--primary-color)' : 'transparent',
                                    color: editorMode === 'select' ? '#fff' : 'var(--text-secondary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <BoxSelect size={16} />
                            </button>
                            <button
                                disabled={!selectedRegion && selectedIds?.length === 0}
                                onClick={() => deleteRegion(selectedIds?.length > 0 ? selectedIds : selectedRegion.id)}
                                title={selectedIds?.length > 1 ? `删除选中的 ${selectedIds.length} 个区块` : "删除区块"}
                                style={{
                                    width: '32px', height: '32px', borderRadius: '8px', border: 'none',
                                    background: 'transparent',
                                    color: (selectedRegion || selectedIds?.length > 0) ? '#ef4444' : 'var(--text-secondary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: (selectedRegion || selectedIds?.length > 0) ? 'pointer' : 'not-allowed',
                                    opacity: (selectedRegion || selectedIds?.length > 0) ? 1 : 0.5,
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Trash2 size={16} />
                            </button>

                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '220px', justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--input-bg)', padding: '2px 8px', borderRadius: '6px' }}>
                        <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><Minus size={14} /></button>
                        <span style={{ fontSize: '12px', minWidth: '35px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(z => Math.min(5.0, z + 0.25))} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><Plus size={14} /></button>
                        <button onClick={() => {
                            if (zoom < 1.49) setZoom(1.5);
                            else if (zoom < 1.99) setZoom(2.0);
                            else setZoom(1.0);
                        }} style={{ fontSize: '10px', background: 'var(--glass-border)', border: 'none', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-primary)', marginLeft: '4px' }}>自适应</button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                            onClick={() => setShowRegions(!showRegions)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px',
                                borderRadius: '6px', border: '1px solid var(--glass-border)',
                                background: 'transparent', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer'
                            }}
                        >
                            {showRegions ? <Eye size={12} /> : <EyeOff size={12} />}
                            {showRegions ? '隐藏区块' : '显示区块'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TopToolbar;

