import React, { useState } from 'react';
import { Edit3, RotateCcw, RotateCw, Plus, Minus, ChevronLeft, ChevronRight, HelpCircle, RefreshCw, Grid, Save, CheckCircle, Trash2, Sparkles, User, AlignJustify, Type, Box, MousePointer2, Layout, Package, CopyPlus, SaveAll, Lock, Unlock, Sliders, Target, Anchor, MoveUpLeft, MoveUpRight, MoveDownLeft, MoveDownRight } from 'lucide-react';
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
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', paddingLeft: '4px', opacity: 0.8 }}>
                            {tableRefining ? '数据抽取策略配置' : '区块类型'}
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }} className="custom-scrollbar">
                            {tableRefining ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                                    <div style={{ marginTop: '15px' }}>
                                        <div style={{ padding: '0 4px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                            <Anchor size={16} color="var(--primary-color)" />
                                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)' }}>动态定位锚点</span>
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
                                                {anchorEntries.map(([corner, anchor]) => {
                                                    const CornerIcon = {
                                                        tl: MoveUpLeft,
                                                        tr: MoveUpRight,
                                                        bl: MoveDownLeft,
                                                        br: MoveDownRight
                                                    }[corner] || Target;

                                                    return (
                                                        <div
                                                            key={corner}
                                                            onClick={() => {
                                                                if (searchAreaEditMode && setActiveSearchAnchor) {
                                                                    setActiveSearchAnchor({ corner });
                                                                }
                                                            }}
                                                            style={{
                                                                padding: '10px',
                                                                borderRadius: '10px',
                                                                background: activeSearchAnchor?.corner === corner ? 'rgba(59, 130, 246, 0.1)' : 'var(--input-bg)',
                                                                border: activeSearchAnchor?.corner === corner ? '1px solid var(--primary-color)' : '1px solid var(--glass-border)',
                                                                cursor: searchAreaEditMode ? 'pointer' : 'default',
                                                                transition: 'all 0.2s',
                                                                display: 'flex',
                                                                gap: '8px',
                                                                alignItems: 'flex-start'
                                                            }}
                                                            className="list-item-hover"
                                                        >
                                                            <div style={{ marginTop: '2px', color: 'var(--accent-color)' }}>
                                                                <CornerIcon size={14} />
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                                                        {cornerLabels[corner] || corner}
                                                                    </span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (updateRegionPositioning) {
                                                                                const newAnchors = { ...anchors };
                                                                                delete newAnchors[corner];
                                                                                updateRegionPositioning(selectedRegion.id, { anchors: newAnchors });
                                                                            }
                                                                        }}
                                                                        style={{
                                                                            background: 'none',
                                                                            border: 'none',
                                                                            padding: '2px',
                                                                            color: 'var(--text-tertiary)',
                                                                            cursor: 'pointer',
                                                                            borderRadius: '4px',
                                                                            transition: 'all 0.2s',
                                                                            marginLeft: '4px'
                                                                        }}
                                                                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                                                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                                                                        title="删除锚点"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                                                        "{anchor.text}"
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {anchorEntries.length > 0 && (
                                            <p style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '8px', opacity: 0.6 }}>注：点击列表项可在编辑模式下激活该锚点</p>
                                        )}

                                        {/* Advanced Options - Custom Collapsible */}
                                        {anchorEntries.length > 0 && (
                                            <div style={{
                                                marginTop: '15px',
                                                border: '1px solid var(--glass-border)',
                                                borderRadius: '12px',
                                                background: searchAreaEditMode ? 'rgba(249, 115, 22, 0.03)' : 'transparent',
                                                overflow: 'hidden',
                                                transition: 'all 0.3s ease'
                                            }}>
                                                <div
                                                    onClick={() => {
                                                        const newMode = !searchAreaEditMode;
                                                        if (setSearchAreaEditMode) setSearchAreaEditMode(newMode);

                                                        if (newMode && anchorEntries.length > 0) {
                                                            const [corner, anchor] = anchorEntries[0];
                                                            if (setActiveSearchAnchor) setActiveSearchAnchor({ corner });
                                                            if (!anchor.search_area && updateRegionPositioning) {
                                                                const [ax0, ay0, ax1, ay1] = anchor.bounds || [0, 0, 0, 0];
                                                                const padding = 0.03;
                                                                const anchorW = ax1 - ax0;
                                                                const anchorH = ay1 - ay0;
                                                                const newAnchors = { ...regions.find(r => r.id === selectedRegion.id)?.positioning?.anchors };
                                                                newAnchors[corner] = {
                                                                    ...anchor,
                                                                    search_area: [
                                                                        Math.max(0, ax0 - padding),
                                                                        Math.max(0, ay0 - padding),
                                                                        Math.min(1 - Math.max(0, ax0 - padding), anchorW + padding * 2),
                                                                        Math.min(1 - Math.max(0, ay0 - padding), anchorH + padding * 2)
                                                                    ]
                                                                };
                                                                updateRegionPositioning(selectedRegion.id, { anchors: newAnchors });
                                                            }
                                                        } else {
                                                            if (setActiveSearchAnchor) setActiveSearchAnchor(null);
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '12px 15px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        cursor: 'pointer',
                                                        background: searchAreaEditMode ? 'rgba(249, 115, 22, 0.08)' : 'rgba(255,255,255,0.02)',
                                                        borderBottom: searchAreaEditMode ? '1px solid rgba(249, 115, 22, 0.1)' : 'none'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Target size={14} color={searchAreaEditMode ? "#f97316" : "var(--text-secondary)"} />
                                                        <span style={{
                                                            fontSize: '13px',
                                                            fontWeight: 'bold',
                                                            color: searchAreaEditMode ? '#f97316' : 'var(--text-secondary)'
                                                        }}>
                                                            限制搜索范围
                                                        </span>
                                                    </div>

                                                    {/* Toggle Switch */}
                                                    <div style={{ position: 'relative', width: '32px', height: '18px', background: searchAreaEditMode ? '#f97316' : 'var(--glass-border)', borderRadius: '10px', transition: '0.3s' }}>
                                                        <div style={{
                                                            position: 'absolute',
                                                            left: searchAreaEditMode ? '16px' : '2px',
                                                            top: '2px',
                                                            width: '14px',
                                                            height: '14px',
                                                            background: '#fff',
                                                            borderRadius: '50%',
                                                            transition: '0.3s',
                                                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                                        }} />
                                                    </div>
                                                </div>

                                                {/* Expandable Content */}
                                                {searchAreaEditMode && activeSearchAnchor && (() => {
                                                    const corner = activeSearchAnchor.corner;
                                                    const anchor = selectedRegion.positioning?.anchors?.[corner];
                                                    if (!anchor) return null;

                                                    const [ax0, ay0, ax1, ay1] = anchor.bounds || [0, 0, 0, 0];
                                                    const aw = ax1 - ax0;
                                                    const ah = ay1 - ay0;
                                                    // Ensure valid anchor dims to avoid division by zero
                                                    const validAw = Math.max(aw, 0.0001);
                                                    const validAh = Math.max(ah, 0.0001);

                                                    const searchArea = anchor.search_area || [ax0, ay0, aw, ah];
                                                    const [sx, sy, sw, sh] = searchArea;

                                                    // Logic Round 4: Anchor to Page Interpolation (0% -> 100%)
                                                    // 0% => Size is Anchor Size
                                                    // 100% => Size is Full Page (1.0)
                                                    // t = (currentSize - anchorSize) / (pageSize - anchorSize)

                                                    const calcProgress = (current, anchorSize) => {
                                                        const denom = 1.0 - anchorSize;
                                                        if (denom <= 0.0001) return 100; // Anchor is already full page
                                                        const t = (current - anchorSize) / denom;
                                                        return Math.min(100, Math.max(0, t * 100));
                                                    };

                                                    const progressW = calcProgress(sw, aw);
                                                    const progressH = calcProgress(sh, ah);

                                                    const updateArea = (pw, ph) => {
                                                        const tw = pw / 100;
                                                        const th = ph / 100;

                                                        // Interpolate Target Width/Height
                                                        const targetW = aw + (1.0 - aw) * tw;
                                                        const targetH = ah + (1.0 - ah) * th;

                                                        const cx = ax0 + aw / 2;
                                                        const cy = ay0 + ah / 2;

                                                        // Calculate Ideal Top-Left (Centered)
                                                        let idealX = cx - targetW / 2;
                                                        let idealY = cy - targetH / 2;

                                                        // Shift-to-fit: Constrain within [0, 1] without shrinking size
                                                        // 1. Constrain Right/Bottom edge
                                                        // if (idealX + targetW > 1) idealX = 1 - targetW;
                                                        // 2. Constrain Left/Top edge (Priority over Right/Bottom to ensure 0 is handled)
                                                        // if (idealX < 0) idealX = 0;

                                                        const nx = Math.max(0, Math.min(1 - targetW, idealX));
                                                        const ny = Math.max(0, Math.min(1 - targetH, idealY));

                                                        // Final W/H might need tiny clamping if math precision issues, but usually strict math above handles it.
                                                        // Ensuring we don't exceed boundaries slightly due to float precision
                                                        const finW = Math.min(targetW, 1 - nx);
                                                        const finH = Math.min(targetH, 1 - ny);

                                                        const newAnchors = { ...selectedRegion.positioning?.anchors };
                                                        newAnchors[corner] = { ...anchor, search_area: [nx, ny, finW, finH] };
                                                        if (updateRegionPositioning) {
                                                            updateRegionPositioning(selectedRegion.id, { anchors: newAnchors });
                                                        }
                                                    };

                                                    const SliderBlock = ({ label, value, onChange }) => (
                                                        <div style={{ marginBottom: '12px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{label}</span>
                                                                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#f97316', fontVariantNumeric: 'tabular-nums' }}>
                                                                    {Math.round(value)}%
                                                                </span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <button
                                                                    className="glass-stepper-btn"
                                                                    onClick={() => onChange(Math.max(0, value - 10))}
                                                                    style={{ color: '#f97316', borderColor: 'rgba(249, 115, 22, 0.3)' }}
                                                                >
                                                                    <Minus size={10} />
                                                                </button>
                                                                <input
                                                                    type="range"
                                                                    min="0" max="100" step="10"
                                                                    value={value}
                                                                    className="glass-slider"
                                                                    style={{ flex: 1, backgroundSize: `${value}% 100%`, '--slider-color': '#f97316' }}
                                                                    onChange={(e) => onChange(parseFloat(e.target.value))}
                                                                />
                                                                <button
                                                                    className="glass-stepper-btn"
                                                                    onClick={() => onChange(Math.min(100, value + 10))}
                                                                    style={{ color: '#f97316', borderColor: 'rgba(249, 115, 22, 0.3)' }}
                                                                >
                                                                    <Plus size={10} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );

                                                    return (
                                                        <div style={{ padding: '15px', animation: 'fadeIn 0.3s ease' }}>
                                                            <SliderBlock
                                                                label="水平扩展 (宽度)"
                                                                value={progressW}
                                                                onChange={(v) => updateArea(v, progressH)}
                                                            />
                                                            <SliderBlock
                                                                label="垂直扩展 (高度)"
                                                                value={progressH}
                                                                onChange={(v) => updateArea(progressW, v)}
                                                            />
                                                        </div>
                                                    );
                                                })()}
                                            </div>
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
