import React, { useState } from 'react';
import { Edit3, RotateCcw, RotateCw, Plus, Minus, ChevronLeft, ChevronRight, HelpCircle, RefreshCw, Grid, Save, CheckCircle, Sparkles, User, AlignJustify, Type, Box, MousePointer2, Layout, Package, CopyPlus, SaveAll, Lock, Unlock, Sliders } from 'lucide-react';
import StrategySelect from './StrategySelect';

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
    tableHistoryIndex,
    tableHistoryLength,
    tableUndo,
    tableRedo,
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
    isSaving,
    loading,
    typeConfig,
    theme,
    templateMode,
    setTemplateMode,
    headerCollapsed = false,
    selectedIds = [],
    regions = [],
    updateRegionPositioning // [NEW]
}) => {
    const [isHoveringToggle, setIsHoveringToggle] = useState(false);

    return (
        <aside
            style={{
                width: collapsed ? '64px' : '300px',
                minWidth: collapsed ? '64px' : '300px',
                position: 'sticky',
                top: '20px',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                height: headerCollapsed ? 'calc(100vh - 76px)' : 'calc(100vh - 100px)',
                overflow: 'visible',
                alignItems: 'flex-end'
            }}
        >
            {/* 悬浮切换按钮 (左边缘居中) */}
            <div
                style={{
                    position: 'absolute',
                    left: '-20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 100,
                    cursor: 'pointer',
                    opacity: isHoveringToggle ? 0.7 : 0.5,
                    transition: 'all 0.3s ease'
                }}
                onMouseEnter={() => setIsHoveringToggle(true)}
                onMouseLeave={() => setIsHoveringToggle(false)}
                onClick={() => setCollapsed(!collapsed)}
            >
                <div style={{
                    width: '20px',
                    height: '48px',
                    background: 'transparent',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-primary)'
                }}>
                    {collapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </div>
            </div>

            {collapsed ? (
                <div className="glass-card" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '20px 0', borderRadius: '16px' }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary-color)'
                    }}>
                        <Edit3 size={20} />
                    </div>

                    <button
                        onClick={() => setCollapsed(false)}
                        style={{ width: '44px', height: '44px', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--primary-color)', transition: 'all 0.2s' }}
                        title="要素编辑"
                    >
                        <Layout size={22} />
                    </button>

                    {!tableRefining && (
                        <button
                            onClick={() => handleSaveTemplate(false)}
                            disabled={isSaving}
                            style={{ width: '44px', height: '44px', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isSaving ? 'not-allowed' : 'pointer', color: 'var(--primary-color)', transition: 'all 0.2s' }}
                            title={isSaving ? "正在保存..." : "保存模板"}
                        >
                            {isSaving ? <RefreshCw size={22} className="animate-spin" /> : <Save size={22} />}
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* 板块 1: 要素编辑/策略中心 */}
                    <div
                        className="glass-card"
                        style={{
                            width: '100%',
                            height: 'auto',
                            padding: '15px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            overflow: 'visible',
                            borderRadius: '16px'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                            <Edit3 size={16} color="var(--primary-color)" />
                            <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{tableRefining ? '策略中心' : '要素编辑'}</span>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }} className="custom-scrollbar">
                            {tableRefining ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div>
                                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>垂直策略 (列)：</span>
                                            <button
                                                onClick={() => {
                                                    const newSettings = { ...tableSettings, vertical_locked: !tableSettings.vertical_locked };
                                                    setTableSettings(newSettings);
                                                    if (tableRefining) {
                                                        setTableRefining({ ...tableRefining, settings: newSettings });
                                                    }
                                                }}
                                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', color: tableSettings.vertical_locked ? 'var(--accent-color)' : 'var(--text-tertiary)' }}
                                                title={tableSettings.vertical_locked ? "解锁列策略" : "锁定列策略"}
                                            >
                                                {tableSettings.vertical_locked ? <Lock size={12} /> : <Unlock size={12} />}
                                            </button>
                                        </p>
                                        <div style={{ pointerEvents: tableSettings.vertical_locked ? 'none' : 'auto', opacity: tableSettings.vertical_locked ? 0.6 : 1 }}>
                                            <StrategySelect
                                                value={tableSettings.vertical_strategy}
                                                onChange={(e) => setTableSettings({ ...tableSettings, vertical_strategy: e.target.value })}
                                                options={[
                                                    { value: "lines", label: "基于线条", icon: AlignJustify },
                                                    { value: "text", label: "基于文字", icon: Type },
                                                    { value: "rects", label: "基于色块", icon: Box },
                                                    { value: "explicit", label: "手动模式", icon: MousePointer2 }
                                                ]}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span>水平策略 (行)：</span>
                                            <button
                                                onClick={() => {
                                                    const newSettings = { ...tableSettings, horizontal_locked: !tableSettings.horizontal_locked };
                                                    setTableSettings(newSettings);
                                                    if (tableRefining) {
                                                        setTableRefining({ ...tableRefining, settings: newSettings });
                                                    }
                                                }}
                                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', color: tableSettings.horizontal_locked ? 'var(--accent-color)' : 'var(--text-tertiary)' }}
                                                title={tableSettings.horizontal_locked ? "锁定行策略" : "解锁行策略"}
                                            >
                                                {tableSettings.horizontal_locked ? <Lock size={12} /> : <Unlock size={12} />}
                                            </button>
                                        </p>
                                        <div style={{ pointerEvents: tableSettings.horizontal_locked ? 'none' : 'auto', opacity: tableSettings.horizontal_locked ? 0.6 : 1 }}>
                                            <StrategySelect
                                                value={tableSettings.horizontal_strategy}
                                                onChange={(e) => setTableSettings({ ...tableSettings, horizontal_strategy: e.target.value })}
                                                options={[
                                                    { value: "lines", label: "基于线条", icon: AlignJustify },
                                                    { value: "text", label: "基于文字", icon: Type },
                                                    { value: "rects", label: "基于色块", icon: Box },
                                                    { value: "explicit", label: "手动模式", icon: MousePointer2 }
                                                ]}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px' }}>吸附容差：</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                            <button
                                                onClick={() => setTableSettings(prev => ({ ...prev, snap_tolerance: Math.max(1, (prev.snap_tolerance || 5) - 1) }))}
                                                className="glass-stepper-btn"
                                                title="减少吸附容差"
                                            >
                                                <Minus size={12} />
                                            </button>
                                            <input
                                                type="range" min="1" max="10" step="1"
                                                value={tableSettings.snap_tolerance || 5}
                                                onChange={(e) => setTableSettings({ ...tableSettings, snap_tolerance: parseInt(e.target.value) })}
                                                className="glass-slider"
                                                style={{ flex: 1, cursor: 'pointer' }}
                                            />
                                            <button
                                                onClick={() => setTableSettings(prev => ({ ...prev, snap_tolerance: Math.min(10, (prev.snap_tolerance || 5) + 1) }))}
                                                className="glass-stepper-btn"
                                                title="增加吸附容差"
                                            >
                                                <Plus size={12} />
                                            </button>
                                            <span style={{ fontSize: '11px', minWidth: '20px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                                                {tableSettings.snap_tolerance || 5}
                                            </span>
                                        </div>
                                    </div>

                                    <button onClick={handleApplyTableSettings} disabled={loading} className="btn-primary" style={{ width: '100%', background: 'var(--accent-color)', fontSize: '12px', padding: '8px', marginTop: '10px' }}>
                                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 分析结构
                                    </button>

                                    <button
                                        onClick={handleCommitTableRules}
                                        className="btn-primary"
                                        style={{
                                            width: '100%',
                                            background: 'var(--success-color)',
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
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                                            {[
                                                'title', 'plain text', 'table caption', 'table', 'figure caption', 'figure', 'header', 'footer', 'list', 'equation', 'abandon', 'custom'
                                            ].map(type => {
                                                const config = typeConfig[type];
                                                if (!config) return null;
                                                const Icon = type === 'custom' ? null : config.icon;

                                                // Determine effective IDs for batch operations
                                                const effectiveSelectedIds = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []);
                                                const isDisabled = effectiveSelectedIds.length === 0;

                                                // Get relevant regions and check their states
                                                const targetedRegions = regions.filter(r => effectiveSelectedIds.includes(r.id));
                                                const isAnyLocked = targetedRegions.some(r => r.locked);

                                                // Active if all selected elements share this type
                                                const isTypeActive = targetedRegions.length > 0 && targetedRegions.every(r => r.type === type);

                                                return (
                                                    <button
                                                        key={type}
                                                        onClick={() => !isAnyLocked && updateRegionType(effectiveSelectedIds, type)}
                                                        disabled={isDisabled || isAnyLocked}
                                                        style={{
                                                            padding: '6px 8px',
                                                            borderRadius: '6px',
                                                            fontSize: '10px',
                                                            border: `1px solid ${isTypeActive ? config.color : 'var(--glass-border)'}`,
                                                            background: isTypeActive ? `${config.color}33` : 'var(--input-bg)',
                                                            color: isTypeActive ? (theme === 'dark' ? '#fff' : config.color) : 'var(--text-secondary)',
                                                            fontWeight: isTypeActive ? 'bold' : 'normal',
                                                            cursor: isDisabled || isAnyLocked ? 'not-allowed' : 'pointer',
                                                            opacity: isDisabled ? 0.4 : (isAnyLocked ? 0.5 : 1),
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px'
                                                        }}
                                                    >
                                                        {Icon && <Icon size={14} />}
                                                        {config.label}
                                                    </button>
                                                );
                                            })}

                                            <button
                                                onClick={() => selectedRegion?.type === 'table' && handleEnterTableRefine(selectedRegion)}
                                                disabled={!selectedRegion || selectedRegion.type !== 'table' || selectedRegion.locked}
                                                style={{
                                                    gridColumn: 'span 3',
                                                    marginTop: '4px',
                                                    padding: '8px',
                                                    borderRadius: '8px',
                                                    fontSize: '12px',
                                                    fontWeight: 'bold',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                    cursor: selectedRegion?.type === 'table' && !selectedRegion.locked ? 'pointer' : 'not-allowed',
                                                    background: selectedRegion?.type === 'table' ? 'rgba(16, 185, 129, 0.1)' : 'var(--input-bg)',
                                                    border: selectedRegion?.type === 'table' ? '1px solid var(--success-color)' : '1px solid var(--glass-border)',
                                                    color: selectedRegion?.type === 'table' ? 'var(--success-color)' : 'var(--text-secondary)',
                                                    opacity: !selectedRegion ? 0.4 : (selectedRegion.type === 'table' ? 1 : 0.5),
                                                    transition: 'all 0.3s'
                                                }}
                                            >
                                                <Sliders size={14} />
                                                高精度表格微调
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px' }}>业务备注</p>
                                        <textarea
                                            value={selectedRegion?.remarks || ''}
                                            onChange={(e) => selectedRegion && updateRegionRemarks(selectedId, e.target.value)}
                                            placeholder={!selectedRegion ? "请先选择要素..." : "额外描述信息..."}
                                            disabled={!selectedRegion || selectedRegion.locked}
                                            style={{
                                                width: '100%',
                                                background: 'var(--input-bg)',
                                                border: '1px solid var(--glass-border)',
                                                padding: '8px',
                                                borderRadius: '6px',
                                                color: 'var(--text-primary)',
                                                fontSize: '12px',
                                                minHeight: '40px',
                                                resize: 'vertical',
                                                opacity: !selectedRegion ? 0.4 : (selectedRegion.locked ? 0.7 : 1),
                                                cursor: !selectedRegion ? 'not-allowed' : 'text',
                                                outline: 'none',
                                                boxShadow: 'none'
                                            }}
                                        />
                                    </div>

                                </div>
                            )}

                            {/* Dynamic Positioning Settings */}
                            {selectedRegion && selectedRegion.positioning && selectedRegion.positioning.enabled && (
                                <div style={{
                                    marginTop: '15px',
                                    padding: '12px',
                                    background: theme === 'dark' ? 'rgba(51, 65, 85, 0.4)' : 'rgba(248, 250, 252, 0.6)',
                                    borderRadius: '10px',
                                    border: '1px solid var(--glass-border)',
                                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                        <Target size={14} style={{ color: 'var(--accent-color)' }} />
                                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>锚点搜索范围 (Robustness)</span>
                                    </div>
                                    <div style={{ padding: '0 5px' }}>
                                        <input
                                            type="range"
                                            min="0" max="3" step="1"
                                            className="glass-slider"
                                            value={(() => {
                                                const anchors = selectedRegion.positioning.anchors || {};
                                                const firstTextAnchor = Object.values(anchors).find(a => a.type === 'text');
                                                if (!firstTextAnchor || !firstTextAnchor.search_area) return 0;
                                                const w = firstTextAnchor.search_area[2];
                                                if (w < 0.2) return 3; // Narrow
                                                if (w < 0.5) return 2; // Medium
                                                if (w < 0.8) return 1; // Wide
                                                return 0; // Global
                                            })()}
                                            onChange={(e) => {
                                                const level = parseInt(e.target.value);
                                                const positioning = { ...selectedRegion.positioning };
                                                const anchors = { ...positioning.anchors };

                                                Object.keys(anchors).forEach(key => {
                                                    if (anchors[key].type === 'text') {
                                                        const [ax0, ay0, ax1, ay1] = anchors[key].bounds;
                                                        const cx = (ax0 + ax1) / 2;
                                                        const cy = (ay0 + ay1) / 2;
                                                        let area = null;
                                                        if (level === 1) area = [Math.max(0, cx - 0.3), Math.max(0, cy - 0.3), 0.6, 0.6];
                                                        else if (level === 2) area = [Math.max(0, cx - 0.15), Math.max(0, cy - 0.15), 0.3, 0.3];
                                                        else if (level === 3) area = [Math.max(0, cx - 0.05), Math.max(0, cy - 0.05), 0.1, 0.1];
                                                        anchors[key] = { ...anchors[key], search_area: area };
                                                    }
                                                });

                                                if (updateRegionPositioning) {
                                                    updateRegionPositioning(selectedRegion.id, { anchors: anchors });
                                                }
                                            }}
                                            style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-color)' }}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <span style={{ display: 'block' }}>全页</span>
                                                <span style={{ fontSize: '9px', opacity: 0.7 }}>Global</span>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <span style={{ display: 'block' }}>精准</span>
                                                <span style={{ fontSize: '9px', opacity: 0.7 }}>Narrow</span>
                                            </div>
                                        </div>
                                    </div>
                                    <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '10px', fontStyle: 'italic', lineHeight: '1.4' }}>
                                        提示：若页面有多个相似文本，请尝试降低搜索范围。
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </aside>
    );
};

export default RightSidebar;
