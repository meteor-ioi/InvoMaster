import React, { useState } from 'react';
import { Edit3, RotateCcw, RotateCw, Plus, Minus, ChevronLeft, ChevronRight, HelpCircle, RefreshCw, Grid, Save, CheckCircle, Sparkles, User, AlignJustify, Type, Box, MousePointer2, Layout, Package, CopyPlus, SaveAll, Lock, Unlock, Sliders, Target } from 'lucide-react';
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
    updateRegionPositioning, // [NEW]
    // 搜索范围编辑模式
    searchAreaEditMode,
    setSearchAreaEditMode,
    activeSearchAnchor,
    setActiveSearchAnchor
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

                            {/* Dynamic Positioning Settings - Anchor Card List */}
                            {selectedRegion && !tableRefining && (() => {
                                const anchors = selectedRegion.positioning?.anchors || {};
                                const anchorEntries = Object.entries(anchors).filter(([_, a]) => a.type === 'text');
                                const cornerLabels = { tl: '左上角', tr: '右上角', bl: '左下角', br: '右下角' };

                                return (
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
                                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>动态定位锚点</span>
                                        </div>

                                        {anchorEntries.length === 0 ? (
                                            /* Empty state guidance */
                                            <div style={{
                                                padding: '16px 12px',
                                                background: theme === 'dark' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)',
                                                borderRadius: '8px',
                                                border: '1px dashed var(--accent-color)',
                                                textAlign: 'center'
                                            }}>
                                                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                                                    拖拽区块角落的 <strong style={{ color: 'var(--accent-color)' }}>⚓</strong> 图标到页面文字上，建立定位锚点
                                                </p>
                                            </div>
                                        ) : (
                                            /* Anchor cards */
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {anchorEntries.map(([corner, anchor]) => (
                                                    <div
                                                        key={corner}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            padding: '8px 10px',
                                                            background: theme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)',
                                                            borderRadius: '6px',
                                                            border: '1px solid rgba(59, 130, 246, 0.3)'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                                            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                                                                {cornerLabels[corner] || corner}
                                                            </span>
                                                            <span style={{ color: 'var(--text-tertiary)' }}>→</span>
                                                            <span style={{
                                                                fontSize: '11px',
                                                                fontWeight: '500',
                                                                color: 'var(--primary-color)',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                                maxWidth: '100px'
                                                            }}>
                                                                "{anchor.text}"
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                if (updateRegionPositioning) {
                                                                    const newAnchors = { ...anchors };
                                                                    delete newAnchors[corner];
                                                                    updateRegionPositioning(selectedRegion.id, { anchors: newAnchors });
                                                                }
                                                            }}
                                                            style={{
                                                                width: '18px',
                                                                height: '18px',
                                                                borderRadius: '4px',
                                                                border: 'none',
                                                                background: 'rgba(239, 68, 68, 0.2)',
                                                                color: '#ef4444',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '14px',
                                                                fontWeight: 'bold',
                                                                lineHeight: 1,
                                                                transition: 'all 0.15s'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.background = '#ef4444';
                                                                e.currentTarget.style.color = '#fff';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                                                e.currentTarget.style.color = '#ef4444';
                                                            }}
                                                            title="删除此锚点"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {anchorEntries.length > 0 && (
                                            <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '10px', fontStyle: 'italic', lineHeight: '1.4' }}>
                                                💡 拖拽画布上的锚点手柄可微调偏移位置
                                            </p>
                                        )}

                                        {/* Advanced Options - Collapsible */}
                                        {anchorEntries.length > 0 && (
                                            <details style={{ marginTop: '12px' }} open={searchAreaEditMode}>
                                                <summary style={{
                                                    fontSize: '11px',
                                                    color: 'var(--text-secondary)',
                                                    cursor: 'pointer',
                                                    userSelect: 'none',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}>
                                                    <ChevronRight size={12} style={{ transition: 'transform 0.2s' }} className="details-chevron" />
                                                    高级选项
                                                </summary>
                                                <div style={{ marginTop: '10px', paddingLeft: '4px' }}>
                                                    {/* Toggle Switch for Search Area Edit Mode */}
                                                    <label style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: '8px',
                                                        fontSize: '11px',
                                                        color: 'var(--text-secondary)',
                                                        cursor: 'pointer',
                                                        marginBottom: '8px'
                                                    }}>
                                                        <span>限制搜索范围</span>
                                                        <div
                                                            onClick={() => {
                                                                const newMode = !searchAreaEditMode;
                                                                if (setSearchAreaEditMode) setSearchAreaEditMode(newMode);

                                                                if (newMode && anchorEntries.length > 0) {
                                                                    // Enter edit mode - set initial search_area if not exists
                                                                    const [corner, anchor] = anchorEntries[0];
                                                                    if (setActiveSearchAnchor) {
                                                                        setActiveSearchAnchor({ regionId: selectedRegion.id, corner });
                                                                    }

                                                                    if (!anchor.search_area && updateRegionPositioning) {
                                                                        // Set default search area with 20px padding (normalized)
                                                                        const [ax0, ay0, ax1, ay1] = anchor.bounds || [0, 0, 0, 0];
                                                                        const anchorW = ax1 - ax0;
                                                                        const anchorH = ay1 - ay0;
                                                                        const padding = 0.03; // ~20px on a 600px canvas
                                                                        const newAnchors = { ...anchors };
                                                                        newAnchors[corner] = {
                                                                            ...anchor,
                                                                            search_area: [
                                                                                Math.max(0, ax0 - padding),
                                                                                Math.max(0, ay0 - padding),
                                                                                Math.min(1, anchorW + padding * 2),
                                                                                Math.min(1, anchorH + padding * 2)
                                                                            ]
                                                                        };
                                                                        updateRegionPositioning(selectedRegion.id, { anchors: newAnchors });
                                                                    }
                                                                } else {
                                                                    // Exit edit mode
                                                                    if (setActiveSearchAnchor) setActiveSearchAnchor(null);
                                                                }
                                                            }}
                                                            style={{
                                                                width: '36px',
                                                                height: '20px',
                                                                borderRadius: '10px',
                                                                background: searchAreaEditMode ? '#f97316' : (theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'),
                                                                position: 'relative',
                                                                transition: 'background 0.2s',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <div style={{
                                                                width: '16px',
                                                                height: '16px',
                                                                borderRadius: '50%',
                                                                background: '#fff',
                                                                position: 'absolute',
                                                                top: '2px',
                                                                left: searchAreaEditMode ? '18px' : '2px',
                                                                transition: 'left 0.2s',
                                                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                                            }} />
                                                        </div>
                                                    </label>

                                                    {/* Slider for scaling - only show when in edit mode */}
                                                    {searchAreaEditMode && anchorEntries.length > 0 && (() => {
                                                        const [corner, anchor] = anchorEntries[0];
                                                        const searchArea = anchor.search_area;
                                                        if (!searchArea) return null;

                                                        // Calculate slider value (0 = anchor size, 100 = full page)
                                                        const [ax0, ay0, ax1, ay1] = anchor.bounds || [0, 0, 0, 0];
                                                        const anchorW = ax1 - ax0;
                                                        const anchorH = ay1 - ay0;
                                                        const currentW = searchArea[2];
                                                        const currentH = searchArea[3];

                                                        // Inverse of the scaling formula
                                                        const tW = anchorW < 1 ? (currentW - anchorW) / (1 - anchorW) : 1;
                                                        const tH = anchorH < 1 ? (currentH - anchorH) / (1 - anchorH) : 1;
                                                        const sliderValue = Math.round(Math.max(tW, tH) * 100);

                                                        return (
                                                            <div style={{ marginTop: '10px' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '6px' }}>
                                                                    <span>锚点边界</span>
                                                                    <span>全页范围</span>
                                                                </div>
                                                                <input
                                                                    type="range"
                                                                    min="0"
                                                                    max="100"
                                                                    value={sliderValue}
                                                                    onChange={(e) => {
                                                                        const t = parseInt(e.target.value) / 100;

                                                                        // Calculate new search area with aspect ratio preservation
                                                                        const currentRatio = searchArea[2] / searchArea[3];
                                                                        const cx = (ax0 + ax1) / 2;
                                                                        const cy = (ay0 + ay1) / 2;

                                                                        let newW = anchorW + t * (1 - anchorW);
                                                                        let newH = anchorH + t * (1 - anchorH);

                                                                        // Preserve the custom aspect ratio if user has manually adjusted
                                                                        if (currentRatio > 0) {
                                                                            const avgScale = (newW + newH) / 2;
                                                                            newW = avgScale * Math.sqrt(currentRatio);
                                                                            newH = avgScale / Math.sqrt(currentRatio);
                                                                        }

                                                                        const newX = Math.max(0, cx - newW / 2);
                                                                        const newY = Math.max(0, cy - newH / 2);

                                                                        if (updateRegionPositioning) {
                                                                            const newAnchors = { ...anchors };
                                                                            newAnchors[corner] = {
                                                                                ...anchor,
                                                                                search_area: [
                                                                                    newX,
                                                                                    newY,
                                                                                    Math.min(newW, 1 - newX),
                                                                                    Math.min(newH, 1 - newY)
                                                                                ]
                                                                            };
                                                                            updateRegionPositioning(selectedRegion.id, { anchors: newAnchors });
                                                                        }
                                                                    }}
                                                                    style={{
                                                                        width: '100%',
                                                                        cursor: 'pointer',
                                                                        accentColor: '#f97316'
                                                                    }}
                                                                />
                                                                <p style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '8px', lineHeight: 1.4 }}>
                                                                    💡 画布上可拖拽橙色矩形四角调整形状
                                                                </p>
                                                            </div>
                                                        );
                                                    })()}

                                                    {!searchAreaEditMode && (
                                                        <p style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '4px', lineHeight: 1.4 }}>
                                                            若页面有多个相似文本，启用此选项可提高匹配精度
                                                        </p>
                                                    )}
                                                </div>
                                            </details>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </>
            )}
        </aside>
    );
};

export default RightSidebar;
