import React from 'react';
import {
    Edit3, ChevronLeft, ChevronRight, RotateCcw, RotateCw,
    Plus, Minus, HelpCircle, Save
} from 'lucide-react';

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
    updateRegionMemo,
    tableSettings,
    setTableSettings,
    handleApplyTableSettings,
    handleEnterTableRefine,
    templateName,
    setTemplateName,
    handleSaveTemplate,
    saveSuccess,
    loading,
    typeConfig,
    theme
}) => {
    return (
        <aside
            className="glass-card"
            style={{
                width: collapsed ? '96px' : '300px',
                minWidth: collapsed ? '96px' : '300px',
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
            {/* Collapse Toggle - Centered on the left edge */}
            <div
                style={{
                    position: 'absolute',
                    left: '0px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '20px',
                    height: '40px',
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    borderLeft: 'none',
                    borderRadius: '0 8px 8px 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    zIndex: 100,
                    boxShadow: '2px 0 10px rgba(0,0,0,0.1)'
                }}
                onClick={() => setCollapsed(!collapsed)}
            >
                {collapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </div>

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: collapsed ? '10px' : '20px',
                    marginTop: '0px',
                    height: '100%'
                }}
            >
                {/* Header Section / Top Icon Area */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    justifyContent: collapsed ? 'center' : 'space-between',
                    height: collapsed ? '64px' : 'auto'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Edit3 size={collapsed ? 24 : 16} color="var(--accent-color)" />
                        {!collapsed && <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{tableRefining ? '策略中心' : '要素编辑'}</span>}
                    </div>

                    {!collapsed && !tableRefining && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button onClick={(e) => { e.stopPropagation(); undo(); }} disabled={historyIndex <= 0} title="撤回" style={{ width: '22px', height: '22px', borderRadius: '50%', border: 'none', background: 'var(--input-bg)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: historyIndex > 0 ? 'pointer' : 'not-allowed', opacity: historyIndex > 0 ? 1 : 0.5 }}>
                                <RotateCcw size={12} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); redo(); }} disabled={historyIndex >= historyLength - 1} title="重做" style={{ width: '22px', height: '22px', borderRadius: '50%', border: 'none', background: 'var(--input-bg)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: historyIndex < historyLength - 1 ? 'pointer' : 'not-allowed', opacity: historyIndex < historyLength - 1 ? 1 : 0.5 }}>
                                <RotateCw size={12} />
                            </button>
                            <div style={{ width: '1px', height: '12px', background: 'var(--glass-border)', margin: '0 4px' }} />
                            <button onClick={(e) => { e.stopPropagation(); setEditorMode(editorMode === 'add' ? 'view' : 'add'); }} title="新增区块" style={{ width: '22px', height: '22px', borderRadius: '50%', border: 'none', background: editorMode === 'add' ? 'var(--primary-color)' : 'var(--input-bg)', color: editorMode === 'add' ? '#fff' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <Plus size={12} />
                            </button>
                            <button disabled={!selectedId} onClick={(e) => { e.stopPropagation(); deleteRegion(selectedId); }} title="删除区块" style={{ width: '22px', height: '22px', borderRadius: '50%', border: 'none', background: 'var(--input-bg)', color: '#ef4444', opacity: selectedId ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: selectedId ? 'pointer' : 'not-allowed' }}>
                                <Minus size={12} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Mirrored Divider & Bottom Icon (only visible when collapsed) */}
                {collapsed && (
                    <>
                        <div style={{ height: '1px', background: 'var(--glass-border)', margin: '10px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '64px' }}>
                            <Save size={24} color="var(--primary-color)" style={{ opacity: 0.8 }} />
                        </div>
                    </>
                )}

                {/* Content Section */}
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
                                        <option value="lines">Lines (基于线)</option>
                                        <option value="text">Text (基于文字对齐)</option>
                                        <option value="rects">Rects (基于块)</option>
                                        <option value="explicit">Explicit (手动模式)</option>
                                    </select>
                                </div>

                                <button onClick={handleApplyTableSettings} disabled={loading} className="btn-secondary" style={{ width: '100%', fontSize: '12px' }}>
                                    应用并重算
                                </button>

                                <div style={{ height: '1px', background: 'var(--glass-border)', margin: '10px 0' }} />

                                <button onClick={() => setTableRefining(null)} style={{ background: 'none', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', padding: '8px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                    退出精细调节
                                </button>
                            </div>
                        ) : selectedRegion ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {selectedRegion.type === 'table' && (
                                    <button onClick={handleEnterTableRefine} className="btn-primary" style={{ width: '100%', fontSize: '12px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid var(--primary-color)', color: 'var(--primary-color)' }}>
                                        进入高精调节模式
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
                                                <button key={type} onClick={() => updateRegionType(selectedId, type)} style={{ padding: '6px 8px', borderRadius: '6px', fontSize: '10px', border: `2px solid ${selectedRegion.type === type ? config.color : 'transparent'}`, background: selectedRegion.type === type ? `${config.color}33` : 'var(--input-bg)', color: selectedRegion.type === type ? (theme === 'dark' ? '#fff' : config.color) : 'var(--text-secondary)', fontWeight: selectedRegion.type === type ? 'bold' : 'normal', cursor: 'pointer' }}>
                                                    {config.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>业务标签</p>
                                    <input type="text" value={selectedRegion.label || ''} onChange={(e) => updateRegionLabel(selectedId, e.target.value)} placeholder="如：料号、数量" style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--glass-border)', padding: '8px', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }} />
                                </div>

                                <div>
                                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>业务备注 (Memo)</p>
                                    <textarea
                                        value={selectedRegion.memo || ''}
                                        onChange={(e) => updateRegionMemo(selectedId, e.target.value)}
                                        placeholder="描述该字段的业务含义，辅助 AI 理解..."
                                        style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--glass-border)', padding: '8px', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px', minHeight: '60px', resize: 'vertical' }}
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
                                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>保存模板名称</p>
                                <input type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)} style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--glass-border)', padding: '8px', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px', marginBottom: '15px' }} />
                                <button onClick={handleSaveTemplate} className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                    <Save size={16} /> 保存并入库
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </aside>
    );
};

export default RightSidebar;
