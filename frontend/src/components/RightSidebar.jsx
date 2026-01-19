import React, { useState } from 'react';
import { Edit3, RotateCcw, RotateCw, Plus, Minus, ChevronLeft, ChevronRight, HelpCircle, RefreshCw, Grid, Save, CheckCircle, Sparkles, User, AlignJustify, Type, Box, MousePointer2, Layout, Package } from 'lucide-react';
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
    loading,
    typeConfig,
    theme,
    templateMode,
    setTemplateMode,
    headerCollapsed = false
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
                    left: '-12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 100,
                    cursor: 'pointer',
                    opacity: isHoveringToggle ? 1 : 0.6,
                    transition: 'all 0.3s ease'
                }}
                onMouseEnter={() => setIsHoveringToggle(true)}
                onMouseLeave={() => setIsHoveringToggle(false)}
                onClick={() => setCollapsed(!collapsed)}
            >
                <div style={{
                    width: '24px',
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
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #8b5cf633, #ec489933)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--accent-color)'
                    }}>
                        <Edit3 size={20} />
                    </div>

                    <div style={{ width: '20px', height: '1px', background: 'var(--glass-border)' }} />

                    <button
                        onClick={() => setCollapsed(false)}
                        style={{ width: '44px', height: '44px', borderRadius: '50%', border: '1px solid var(--accent-color)', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--accent-color)', transition: 'all 0.2s' }}
                        title="要素编辑"
                    >
                        <Layout size={20} />
                    </button>

                    {!tableRefining && (
                        <button
                            onClick={handleSaveTemplate}
                            style={{ width: '44px', height: '44px', borderRadius: '50%', border: '1px solid var(--success-color)', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--success-color)', transition: 'all 0.2s' }}
                            title="保存并入库"
                        >
                            <Save size={20} />
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
                            flex: 1,
                            padding: '15px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            overflow: 'hidden',
                            borderRadius: '16px'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Edit3 size={16} color="var(--accent-color)" />
                                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{tableRefining ? '策略中心' : '要素编辑'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {tableRefining ? (
                                    <>
                                        <button onClick={(e) => { e.stopPropagation(); tableUndo(); }} disabled={tableHistoryIndex <= 0} title="撤回表格操作" style={{ width: '22px', height: '22px', borderRadius: '50%', border: 'none', background: 'var(--input-bg)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: tableHistoryIndex > 0 ? 'pointer' : 'not-allowed', opacity: tableHistoryIndex > 0 ? 1 : 0.5 }}>
                                            <RotateCcw size={12} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); tableRedo(); }} disabled={tableHistoryIndex >= tableHistoryLength - 1} title="重做表格操作" style={{ width: '22px', height: '22px', borderRadius: '50%', border: 'none', background: 'var(--input-bg)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: tableHistoryIndex < tableHistoryLength - 1 ? 'pointer' : 'not-allowed', opacity: tableHistoryIndex < tableHistoryLength - 1 ? 1 : 0.5 }}>
                                            <RotateCw size={12} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={(e) => { e.stopPropagation(); undo(); }} disabled={historyIndex <= 0} title="撤回" style={{ width: '22px', height: '22px', borderRadius: '50%', border: 'none', background: 'var(--input-bg)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: historyIndex > 0 ? 'pointer' : 'not-allowed', opacity: historyIndex > 0 ? 1 : 0.5 }}>
                                            <RotateCcw size={12} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); redo(); }} disabled={historyIndex >= historyLength - 1} title="重做" style={{ width: '22px', height: '22px', borderRadius: '50%', border: 'none', background: 'var(--input-bg)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: historyIndex < historyLength - 1 ? 'pointer' : 'not-allowed', opacity: historyIndex < historyLength - 1 ? 1 : 0.5 }}>
                                            <RotateCw size={12} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div style={{ width: '100%', height: '1px', background: 'var(--glass-border)', marginBottom: '5px' }} />

                        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }} className="custom-scrollbar">
                            {tableRefining ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div>
                                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
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
                                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>水平策略 (行)：</p>
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
                                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>吸附容差：</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <input
                                                type="range" min="1" max="10" step="1"
                                                value={tableSettings.snap_tolerance || 3}
                                                onChange={(e) => setTableSettings({ ...tableSettings, snap_tolerance: parseInt(e.target.value) })}
                                                style={{ flex: 1, accentColor: 'var(--primary-color)', cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '11px', minWidth: '20px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                                                {tableSettings.snap_tolerance || 3}
                                            </span>
                                        </div>
                                    </div>

                                    <button onClick={handleApplyTableSettings} disabled={loading} className="btn-primary" style={{ width: '100%', background: 'var(--accent-color)', fontSize: '12px', padding: '8px', marginTop: '10px' }}>
                                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 重新分析结构
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
                                                const isDisabled = !selectedRegion;
                                                return (
                                                    <button
                                                        key={type}
                                                        onClick={() => selectedRegion && !selectedRegion.locked && updateRegionType(selectedId, type)}
                                                        disabled={isDisabled || selectedRegion?.locked}
                                                        style={{
                                                            padding: '6px 8px',
                                                            borderRadius: '6px',
                                                            fontSize: '10px',
                                                            border: `1px solid ${selectedRegion?.type === type ? config.color : 'var(--glass-border)'}`,
                                                            background: selectedRegion?.type === type ? `${config.color}33` : 'var(--input-bg)',
                                                            color: selectedRegion?.type === type ? (theme === 'dark' ? '#fff' : config.color) : 'var(--text-secondary)',
                                                            fontWeight: selectedRegion?.type === type ? 'bold' : 'normal',
                                                            cursor: isDisabled || selectedRegion?.locked ? 'not-allowed' : 'pointer',
                                                            opacity: isDisabled ? 0.4 : (selectedRegion?.locked && selectedRegion?.type !== type ? 0.5 : 1),
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
                                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>业务备注</p>
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
                                gap: '15px',
                                borderRadius: '16px',
                                display: 'flex'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '5px' }}>
                                <Package size={16} color="var(--accent-color)" />
                                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>模板保存</span>
                            </div>
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

                            <input
                                type="text"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder="请输入保存模板名称"
                                style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--glass-border)', padding: '8px', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }}
                            />

                            <button
                                onClick={handleSaveTemplate}
                                className="btn-primary"
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px'
                                }}
                            >
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
