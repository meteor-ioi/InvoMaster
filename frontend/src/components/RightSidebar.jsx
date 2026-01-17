import React from 'react';
import { Edit3, RotateCcw, RotateCw, Plus, Minus, ChevronLeft, ChevronRight, HelpCircle, RefreshCw, Grid, Save, CheckCircle, Sparkles, User } from 'lucide-react';

const RightSidebar = ({
    collapsed,
    setCollapsed,
    tableRefining,
    setTableRefining,
    selectedRegion,
    selectedId,
    setSelectedId,
    editorMode,
    setEditorMode,
    historyIndex,
    historyLength,
    undo,
    redo,
    deleteRegion,
    updateRegionType,
    updateRegionLabel,
    updateRegionRemarks,
    toggleRegionLock,
    tableSettings,
    setTableSettings,
    handleApplyTableSettings,
    handleCommitTableRules,
    handleEnterTableRefine,
    templateName,
    setTemplateName,
    handleSaveTemplate,
    saveSuccess,
    loading,
    typeConfig,
    theme,
    templateMode,
    setTemplateMode
}) => {
    return (
        <aside
            className="glass-card"
            style={{
                width: collapsed ? '40px' : '300px',
                minWidth: collapsed ? '40px' : '300px',
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
                {collapsed ? (
                    <ChevronLeft size={18} color="var(--text-secondary)" />
                ) : (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Edit3 size={16} color="var(--accent-color)" />
                            <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{tableRefining ? '策略中心' : '要素编辑'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {!tableRefining && (
                                <>
                                    <button onClick={(e) => { e.stopPropagation(); undo(); }} disabled={historyIndex <= 0} title="撤回" style={{ width: '22px', height: '22px', borderRadius: '50%', border: 'none', background: 'var(--input-bg)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: historyIndex > 0 ? 'pointer' : 'not-allowed', opacity: historyIndex > 0 ? 1 : 0.5 }}>
                                        <RotateCcw size={12} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); redo(); }} disabled={historyIndex >= historyLength - 1} title="重做" style={{ width: '22px', height: '22px', borderRadius: '50%', border: 'none', background: 'var(--input-bg)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: historyIndex < historyLength - 1 ? 'pointer' : 'not-allowed', opacity: historyIndex < historyLength - 1 ? 1 : 0.5 }}>
                                        <RotateCw size={12} />
                                    </button>
                                    <div style={{ width: '1px', height: '12px', background: 'var(--glass-border)', margin: '0 4px' }} />
                                    <button
                                        disabled={!selectedId}
                                        onClick={(e) => { e.stopPropagation(); toggleRegionLock(selectedId); }}
                                        title={selectedRegion?.locked ? "解锁区块" : "锁定区块"}
                                        style={{
                                            width: '22px', height: '22px', borderRadius: '50%', border: 'none',
                                            background: selectedRegion?.locked ? 'var(--accent-color)' : 'var(--input-bg)',
                                            color: selectedRegion?.locked ? '#fff' : 'var(--text-secondary)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: selectedId ? 'pointer' : 'not-allowed',
                                            opacity: selectedId ? 1 : 0.5
                                        }}
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                                    <button onClick={(e) => { e.stopPropagation(); setEditorMode(editorMode === 'add' ? 'view' : 'add'); }} title="新增区块" style={{ width: '22px', height: '22px', borderRadius: '50%', border: 'none', background: editorMode === 'add' ? 'var(--primary-color)' : 'var(--input-bg)', color: editorMode === 'add' ? '#fff' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                        <Plus size={12} />
                                    </button>
                                    <button disabled={!selectedId || selectedRegion?.locked} onClick={(e) => { e.stopPropagation(); deleteRegion(selectedId); }} title="删除区块" style={{ width: '22px', height: '22px', borderRadius: '50%', border: 'none', background: 'var(--input-bg)', color: '#ef4444', opacity: (selectedId && !selectedRegion?.locked) ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (selectedId && !selectedRegion?.locked) ? 'pointer' : 'not-allowed' }}>
                                        <Minus size={12} />
                                    </button>
                                </>
                            )}
                            <ChevronRight size={16} color="var(--text-secondary)" />
                        </div>
                    </>
                )}
            </div>

            {!collapsed && (
                <>
                    {tableRefining ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    垂直策略 (列) <HelpCircle size={10} />
                                </p>
                                <select
                                    value={tableSettings.vertical_strategy}
                                    onChange={(e) => setTableSettings({ ...tableSettings, vertical_strategy: e.target.value })}
                                    style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--glass-border)', padding: '6px', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }}
                                >
                                    <option value="lines">基于线</option>
                                    <option value="text">基于文字对齐</option>
                                    <option value="rects">基于块</option>
                                    <option value="explicit">手动模式</option>
                                </select>
                            </div>

                            <div>
                                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>水平策略 (行)</p>
                                <select
                                    value={tableSettings.horizontal_strategy}
                                    onChange={(e) => setTableSettings({ ...tableSettings, horizontal_strategy: e.target.value })}
                                    style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--glass-border)', padding: '6px', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }}
                                >
                                    <option value="lines">基于线</option>
                                    <option value="text">基于文字对齐</option>
                                    <option value="rects">基于块</option>
                                    <option value="explicit">手动模式</option>
                                </select>
                            </div>

                            <div>
                                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>吸附容差 (Snap)</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input
                                        type="range" min="1" max="10" step="1"
                                        value={tableSettings.snap_tolerance || 3}
                                        onChange={(e) => setTableSettings({ ...tableSettings, snap_tolerance: parseInt(e.target.value) })}
                                        style={{ flex: 1, accentColor: 'var(--primary-color)', height: '4px' }}
                                    />
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', minWidth: '15px' }}>{tableSettings.snap_tolerance || 3}</span>
                                </div>
                            </div>

                            <button onClick={handleApplyTableSettings} disabled={loading} className="btn-primary" style={{ width: '100%', background: 'var(--accent-color)', fontSize: '12px', padding: '8px' }}>
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 重新分析结构
                            </button>

                            <button
                                onClick={handleCommitTableRules}
                                className="btn-primary"
                                style={{
                                    width: '100%',
                                    background: saveSuccess ? 'var(--success-color)' : 'var(--success-color)',
                                    opacity: saveSuccess ? 0.9 : 1,
                                    fontSize: '12px',
                                    padding: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                {saveSuccess ? <CheckCircle size={14} /> : <Save size={14} />}
                                {saveSuccess ? '识别规则已保存' : '保存识别规则'}
                            </button>

                            <button onClick={() => setTableRefining(null)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-primary)', fontSize: '12px', cursor: 'pointer' }}>
                                退出微调模式
                            </button>
                        </div>
                    ) : selectedRegion ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {selectedRegion.type === 'table' && (
                                <button onClick={() => handleEnterTableRefine(selectedRegion)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success-color)', color: 'var(--success-color)', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <Grid size={16} /> 高精度表格微调
                                </button>
                            )}

                            <div>
                                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>要素分类</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                    {[
                                        'title', 'plain text', 'table caption', 'table', 'figure caption', 'figure', 'header', 'footer', 'list', 'equation', 'text', 'abandon', 'custom'
                                    ].map(type => {
                                        const config = typeConfig[type];
                                        if (!config) return null;
                                        return (
                                            <button
                                                key={type}
                                                onClick={() => !selectedRegion.locked && updateRegionType(selectedId, type)}
                                                disabled={selectedRegion.locked}
                                                style={{
                                                    padding: '6px 8px',
                                                    borderRadius: '6px',
                                                    fontSize: '10px',
                                                    border: `2px solid ${selectedRegion.type === type ? config.color : 'transparent'}`,
                                                    background: selectedRegion.type === type ? `${config.color}33` : 'var(--input-bg)',
                                                    color: selectedRegion.type === type ? (theme === 'dark' ? '#fff' : config.color) : 'var(--text-secondary)',
                                                    fontWeight: selectedRegion.type === type ? 'bold' : 'normal',
                                                    cursor: selectedRegion.locked ? 'not-allowed' : 'pointer',
                                                    opacity: selectedRegion.locked && selectedRegion.type !== type ? 0.5 : 1
                                                }}
                                            >
                                                {config.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>业务备注</p>
                                <textarea
                                    value={selectedRegion.remarks || ''}
                                    onChange={(e) => updateRegionRemarks(selectedId, e.target.value)}
                                    placeholder="额外描述信息..."
                                    disabled={selectedRegion.locked}
                                    style={{
                                        width: '100%',
                                        background: 'var(--input-bg)',
                                        border: '1px solid var(--glass-border)',
                                        padding: '8px',
                                        borderRadius: '6px',
                                        color: 'var(--text-primary)',
                                        fontSize: '12px',
                                        minHeight: '60px',
                                        resize: 'vertical',
                                        opacity: selectedRegion.locked ? 0.7 : 1
                                    }}
                                />
                            </div>
                        </div>
                    ) : (
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', fontStyle: 'italic', padding: '10px' }}>
                            {editorMode === 'add' ? '正在新增模式：在左侧图中拖拽即可创建' : '在图中点击选框以开始编辑'}
                        </p>
                    )}

                    {!tableRefining && (
                        <div style={{ marginTop: '10px', borderTop: '1px solid var(--glass-border)', paddingTop: '15px' }}>
                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>模板类型</p>
                            <div style={{ display: 'flex', gap: '8px', background: 'var(--input-bg)', padding: '4px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                <button
                                    onClick={() => setTemplateMode('auto')}
                                    style={{
                                        flex: 1,
                                        padding: '6px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        fontSize: '11px',
                                        cursor: 'pointer',
                                        background: templateMode === 'auto' ? 'var(--primary-color)' : 'transparent',
                                        color: templateMode === 'auto' ? '#fff' : 'var(--text-secondary)',
                                        fontWeight: templateMode === 'auto' ? 'bold' : 'normal',
                                        transition: 'all 0.3s ease',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                    }}
                                >
                                    <Sparkles size={12} /> 标准模式
                                </button>
                                <button
                                    onClick={() => setTemplateMode('custom')}
                                    style={{
                                        flex: 1,
                                        padding: '6px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        fontSize: '11px',
                                        cursor: 'pointer',
                                        background: templateMode === 'custom' ? 'var(--accent-color)' : 'transparent',
                                        color: templateMode === 'custom' ? '#fff' : 'var(--text-secondary)',
                                        fontWeight: templateMode === 'custom' ? 'bold' : 'normal',
                                        transition: 'all 0.3s ease',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                    }}
                                >
                                    <User size={12} /> 自定义模式
                                </button>
                            </div>

                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>保存模板名称</p>
                            <input type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)} style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--glass-border)', padding: '8px', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px', marginBottom: '15px' }} />
                            <button onClick={handleSaveTemplate} className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                <Save size={16} /> 保存并入库
                            </button>
                        </div>
                    )}
                </>
            )}
        </aside>
    );
};

export default RightSidebar;
