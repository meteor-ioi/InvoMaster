import React, { useState } from 'react';
import { Edit3, RotateCcw, RotateCw, Plus, Minus, ChevronLeft, ChevronRight, HelpCircle, RefreshCw, Grid, Save, CheckCircle, Sparkles, User, AlignJustify, Type, Box, MousePointer2, Layout, Package, CopyPlus, SaveAll } from 'lucide-react';
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
    regions = []
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
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
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
                                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            垂直策略 (列)：
                                        </p>
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

                                    <div>
                                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px' }}>水平策略 (行)：</p>
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

                                    <div>
                                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px' }}>吸附容差：</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                            <button
                                                onClick={() => setTableSettings(prev => ({ ...prev, snap_tolerance: Math.max(1, (prev.snap_tolerance || 3) - 1) }))}
                                                className="glass-stepper-btn"
                                                title="减少吸附容差"
                                            >
                                                <Minus size={12} />
                                            </button>
                                            <input
                                                type="range" min="1" max="10" step="1"
                                                value={tableSettings.snap_tolerance || 3}
                                                onChange={(e) => setTableSettings({ ...tableSettings, snap_tolerance: parseInt(e.target.value) })}
                                                className="glass-slider"
                                                style={{ flex: 1, cursor: 'pointer' }}
                                            />
                                            <button
                                                onClick={() => setTableSettings(prev => ({ ...prev, snap_tolerance: Math.min(10, (prev.snap_tolerance || 3) + 1) }))}
                                                className="glass-stepper-btn"
                                                title="增加吸附容差"
                                            >
                                                <Plus size={12} />
                                            </button>
                                            <span style={{ fontSize: '11px', minWidth: '20px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                                                {tableSettings.snap_tolerance || 3}
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
                                                <Grid size={14} />
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
                                                minHeight: '60px',
                                                resize: 'vertical',
                                                opacity: !selectedRegion ? 0.4 : (selectedRegion.locked ? 0.7 : 1),
                                                cursor: !selectedRegion ? 'not-allowed' : 'text'
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 板块 2: 模板持久化 */}
                    {!tableRefining && (
                        <div
                            className="glass-card"
                            style={{
                                width: '100%',
                                padding: '15px',
                                flexDirection: 'column',
                                borderRadius: '16px',
                                display: 'flex',
                                flex: 1,
                                overflow: 'hidden'
                            }}
                        >
                            {/* 内部可滚动区域 */}
                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px', paddingRight: '2px' }} className="custom-scrollbar">
                                <div style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Package size={16} color={templateMode === 'custom' ? 'var(--accent-color)' : 'var(--primary-color)'} />
                                        <span style={{ fontSize: '13px', fontWeight: 'bold' }}>模板保存</span>
                                    </div>
                                </div>

                                {/* 模式切换栏 (移动至卡片内容中) */}
                                <div style={{ display: 'flex', gap: '2px', background: 'var(--input-bg)', padding: '2px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                                    <button
                                        onClick={() => setTemplateMode('auto')}
                                        title="标准模式"
                                        style={{
                                            flex: 1,
                                            padding: '6px 8px',
                                            borderRadius: '8px',
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
                                        title="自定义模式"
                                        style={{
                                            flex: 1,
                                            padding: '6px 8px',
                                            borderRadius: '8px',
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

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', paddingLeft: '4px', opacity: 0.8 }}>模板名称</div>
                                    <input
                                        type="text"
                                        value={templateName}
                                        onChange={(e) => setTemplateName(e.target.value)}
                                        placeholder="请输入保存模板名称..."
                                        style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--glass-border)', padding: '8px', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }}
                                    />
                                </div>
                            </div>

                            {/* 底部固定按钮区 */}
                            <div style={{ paddingTop: '15px', borderTop: '1px solid var(--glass-border)' }}>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={() => handleSaveTemplate(false)}
                                        disabled={isSaving}
                                        className={`btn-primary ${isSaving ? 'shimmer-effect' : ''}`}
                                        style={{
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            margin: 0,
                                            background: isSaving
                                                ? 'var(--text-secondary)'
                                                : (templateMode === 'auto'
                                                    ? 'linear-gradient(135deg, var(--primary-color) 0%, #2563eb 100%)'
                                                    : 'linear-gradient(135deg, var(--accent-color) 0%, #7c3aed 100%)'),
                                            border: 'none',
                                            boxShadow: isSaving ? 'none' : '0 4px 12px rgba(99, 102, 241, 0.25)',
                                            fontSize: '12px',
                                            padding: '0 12px',
                                            height: '42px',
                                            borderRadius: '12px',
                                            fontWeight: '600',
                                            transition: 'transform 0.2s, box-shadow 0.2s',
                                            cursor: isSaving ? 'not-allowed' : 'pointer',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isSaving) {
                                                e.currentTarget.style.transform = 'translateY(-1px)';
                                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.35)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isSaving) {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.25)';
                                            }
                                        }}
                                    >
                                        {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                        {isSaving ? '正在保存中...' : '保存模板'}
                                    </button>

                                    {templateMode === 'custom' && (
                                        <button
                                            onClick={() => handleSaveTemplate(true)}
                                            disabled={isSaving}
                                            style={{
                                                flex: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                margin: 0,
                                                background: 'rgba(124, 58, 237, 0.05)',
                                                border: '1.5px solid rgba(124, 58, 237, 0.3)',
                                                color: 'var(--accent-color)',
                                                fontSize: '12px',
                                                padding: '0 12px',
                                                height: '42px',
                                                borderRadius: '12px',
                                                fontWeight: '600',
                                                cursor: isSaving ? 'not-allowed' : 'pointer',
                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                opacity: isSaving ? 0.6 : 1
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isSaving) {
                                                    e.currentTarget.style.background = 'rgba(124, 58, 237, 0.1)';
                                                    e.currentTarget.style.borderColor = 'var(--accent-color)';
                                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isSaving) {
                                                    e.currentTarget.style.background = 'rgba(124, 58, 237, 0.05)';
                                                    e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.3)';
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                }
                                            }}
                                        >
                                            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <CopyPlus size={14} />}
                                            {isSaving ? '正在另存...' : '另存为'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )
            }
        </aside >
    );
};

export default RightSidebar;
