import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Heading, Grid3X3, AlignLeft, Type, Ban, Image, List, PanelTop, PanelBottom, Sigma, TextSelect, MessageSquareText, BoxSelect } from 'lucide-react';

const TYPE_CONFIG = {
    'title': { label: '标题', color: '#60a5fa', icon: Heading },
    'table': { label: '表格', color: '#10b981', icon: Grid3X3 },
    'plain text': { label: '普通正文', color: '#94a3b8', icon: AlignLeft },
    'text': { label: '普通正文', color: '#94a3b8', icon: Type },
    'abandon': { label: '无效区域', color: '#808080', icon: Ban },
    'figure': { label: '图片', color: '#f59e0b', icon: Image },
    'list': { label: '列表', color: '#ec4899', icon: List },
    'header': { label: '页眉', color: '#8b5cf6', icon: PanelTop },
    'footer': { label: '页脚', color: '#6366f1', icon: PanelBottom },
    'equation': { label: '数学公式', color: '#10b981', icon: Sigma },
    'table caption': { label: '表格标题', color: '#0ea5e9', icon: TextSelect },
    'figure caption': { label: '图片标题', color: '#f97316', icon: MessageSquareText },
    'custom': { label: '自定义区域', color: '#f43f5e', icon: BoxSelect }
};

const HANDLE_SIZE = 9; // Slightly increased base size

const DocumentEditor = ({
    image, regions, viewFilters = {}, setRegions, selectedId, setSelectedId, editorMode = 'view',
    tableRefining = null, setTableRefining = null, onAnalyze = null, onSettingsChange = null,
    zoom = 1.0,
    showRegions = true,
    onDelete = null,
    onToggleLock = null,
    onHistorySnapshot = null
}) => {

    const [interaction, setInteraction] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentRect, setCurrentRect] = useState(null);
    const containerRef = useRef(null);
    const viewportRef = useRef(null);

    const getCoordinates = (e) => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        return { x, y };
    };

    const handleMouseDown = (e) => {
        const { x, y } = getCoordinates(e);
        if (tableRefining) return; // Interaction handled by lines if refining

        if (editorMode === 'add' && (e.target === containerRef.current || e.target.tagName === 'svg')) {
            // 计算当前已有的 custom 区块数量,从 0 开始编号(和 auto 编号规则一致)
            const customCount = regions.filter(r => r.id && r.id.startsWith('custom_')).length;
            const newId = `custom_${customCount}`;

            setIsDrawing(true);
            setSelectedId(null);
            setCurrentRect({
                x, y, width: 0, height: 0,
                id: newId,
                type: 'custom',
                label: ''
            });
            return;
        }
    };

    const startResize = (e, id, handle) => {
        e.stopPropagation();
        const region = regions.find(r => r.id === id);
        if (region && region.locked) return; // Prevent resizing if locked
        const { x, y } = getCoordinates(e);
        setInteraction({ type: 'resize', id, handle, startX: x, startY: y, initialRegion: { ...region } });
    };

    const startMove = (e, id) => {
        e.stopPropagation();
        setSelectedId(id);
        const region = regions.find(r => r.id === id);
        if (region && region.locked) return; // Prevent moving if locked
        const { x, y } = getCoordinates(e);
        setInteraction({ type: 'move', id, startX: x, startY: y, initialRegion: { ...region } });
    };

    const tableRefiningRef = useRef(tableRefining);
    useEffect(() => {
        tableRefiningRef.current = tableRefining;
    }, [tableRefining]);

    const startTableLineMove = (e, type, index, val) => {
        e.stopPropagation();
        e.preventDefault();
        if (type === 'col' && (index === 0 || index === tableRefining.cols.length - 1)) return;
        if (type === 'row' && (index === 0 || index === tableRefining.rows.length - 1)) return;

        const handleDocMouseMove = (moveE) => {
            if (!containerRef.current) return;
            const currentRefining = tableRefiningRef.current;
            if (!currentRefining) return;

            const rect = containerRef.current.getBoundingClientRect();
            const x = (moveE.clientX - rect.left) / rect.width;
            const y = (moveE.clientY - rect.top) / rect.height;

            const reg = regions.find(r => r.id === currentRefining.id);
            if (!reg) return;

            if (type === 'col') {
                const relX = (x - reg.x) / reg.width;
                const newVal = Math.max(0.01, Math.min(0.99, relX));
                const newCols = [...currentRefining.cols];
                newCols[index] = newVal;
                setTableRefining(prev => ({ ...prev, cols: newCols }));
            } else {
                const relY = (y - reg.y) / reg.height;
                const newVal = Math.max(0.01, Math.min(0.99, relY));
                const newRows = [...currentRefining.rows];
                newRows[index] = newVal;
                setTableRefining(prev => ({ ...prev, rows: newRows }));
            }
        };

        const handleDocMouseUp = () => {
            document.removeEventListener('mousemove', handleDocMouseMove);
            document.removeEventListener('mouseup', handleDocMouseUp);

            const finalRefining = tableRefiningRef.current;
            if (finalRefining && onAnalyze) {
                const newSettings = {
                    ...finalRefining.settings,
                    vertical_strategy: "explicit",
                    horizontal_strategy: "explicit",
                    explicit_vertical_lines: finalRefining.cols,
                    explicit_horizontal_lines: finalRefining.rows
                };
                onAnalyze(newSettings);
                if (onSettingsChange) onSettingsChange({ vertical_strategy: 'explicit', horizontal_strategy: 'explicit' });
            }
        };

        document.addEventListener('mousemove', handleDocMouseMove);
        document.addEventListener('mouseup', handleDocMouseUp);
    };

    const [addLineHover, setAddLineHover] = useState(null);

    const addTableLine = (e, type, val) => {
        e.stopPropagation();
        if (!tableRefining || !onAnalyze) return;

        let newSettings = {
            ...tableRefining.settings,
            vertical_strategy: "explicit",
            horizontal_strategy: "explicit"
        };

        if (type === 'col') {
            const newCols = [...tableRefining.cols, val].sort((a, b) => a - b);
            setTableRefining({ ...tableRefining, cols: newCols });
            newSettings.explicit_vertical_lines = newCols;
            newSettings.explicit_horizontal_lines = tableRefining.rows;
        } else {
            const newRows = [...tableRefining.rows, val].sort((a, b) => a - b);
            setTableRefining({ ...tableRefining, rows: newRows });
            newSettings.explicit_horizontal_lines = newRows;
            newSettings.explicit_vertical_lines = tableRefining.cols;
        }

        onAnalyze(newSettings);
        if (onSettingsChange) onSettingsChange({ vertical_strategy: 'explicit', horizontal_strategy: 'explicit' });
        setAddLineHover(null);
    };

    const handleMouseMove = (e) => {
        const { x, y } = getCoordinates(e);

        if (isDrawing) {
            setCurrentRect(prev => ({
                ...prev,
                width: x - prev.x,
                height: y - prev.y
            }));
            return;
        }

        if (tableRefining && !interaction) {
            const reg = regions.find(r => r.id === tableRefining.id);
            if (reg) {
                const hoverThreshold = 0.04;
                if (x >= reg.x - hoverThreshold && x <= reg.x + hoverThreshold / 2 && y >= reg.y && y <= reg.y + reg.height) {
                    const relY = (y - reg.y) / reg.height;
                    setAddLineHover({ type: 'row', val: relY, x: reg.x, y: y });
                }
                else if (y >= reg.y - hoverThreshold && y <= reg.y + hoverThreshold / 2 && x >= reg.x && x <= reg.x + reg.width) {
                    const relX = (x - reg.x) / reg.width;
                    setAddLineHover({ type: 'col', val: relX, x: x, y: reg.y });
                }
                else {
                    setAddLineHover(null);
                }
            }
        } else {
            setAddLineHover(null);
        }

        if (!interaction) return;

        if (interaction.type === 'move') {
            const dx = x - interaction.startX;
            const dy = y - interaction.startY;
            setRegions(prev => prev.map(r => r.id === interaction.id ? {
                ...r,
                x: Math.max(0, Math.min(1 - r.width, interaction.initialRegion.x + dx)),
                y: Math.max(0, Math.min(1 - r.height, interaction.initialRegion.y + dy))
            } : r));
        } else if (interaction.type === 'resize') {
            const dx = x - interaction.startX;
            const dy = y - interaction.startY;
            const r = interaction.initialRegion;
            let newReg = { ...r };

            if (interaction.handle.includes('e')) newReg.width = Math.max(0.001, r.width + dx);
            if (interaction.handle.includes('s')) newReg.height = Math.max(0.001, r.height + dy);
            if (interaction.handle.includes('w')) {
                const nextX = Math.max(0, r.x + dx);
                newReg.width = Math.max(0.001, r.x + r.width - nextX);
                newReg.x = nextX;
            }
            if (interaction.handle.includes('n')) {
                const nextY = Math.max(0, r.y + dy);
                newReg.height = Math.max(0.001, r.y + r.height - nextY);
                newReg.y = nextY;
            }

            setRegions(prev => prev.map(reg => reg.id === interaction.id ? newReg : reg));
        }
    };

    const deleteTableLine = (e, type, index) => {
        e.stopPropagation();
        if (!tableRefining || !onAnalyze) return;
        if (type === 'col' && (index === 0 || index === tableRefining.cols.length - 1)) return;
        if (type === 'row' && (index === 0 || index === tableRefining.rows.length - 1)) return;

        let newSettings = {
            ...tableRefining.settings,
            vertical_strategy: "explicit",
            horizontal_strategy: "explicit"
        };

        if (type === 'col') {
            const newCols = tableRefining.cols.filter((_, i) => i !== index);
            setTableRefining({ ...tableRefining, cols: newCols });
            newSettings.explicit_vertical_lines = newCols;
            newSettings.explicit_horizontal_lines = tableRefining.rows;
        } else {
            const newRows = tableRefining.rows.filter((_, i) => i !== index);
            setTableRefining({ ...tableRefining, rows: newRows });
            newSettings.explicit_horizontal_lines = newRows;
            newSettings.explicit_vertical_lines = tableRefining.cols;
        }

        onAnalyze(newSettings);
        if (onSettingsChange) onSettingsChange({ vertical_strategy: 'explicit', horizontal_strategy: 'explicit' });
    };

    const handleMouseUp = () => {
        if (isDrawing && currentRect && Math.abs(currentRect.width) > 0.005) {
            const normalized = {
                ...currentRect,
                x: currentRect.width < 0 ? currentRect.x + currentRect.width : currentRect.x,
                y: currentRect.height < 0 ? currentRect.y + currentRect.height : currentRect.y,
                width: Math.abs(currentRect.width),
                height: Math.abs(currentRect.height)
            };
            const newRegions = [...regions, normalized];
            setRegions(newRegions);
            setSelectedId(normalized.id);
            if (onHistorySnapshot) onHistorySnapshot(newRegions);
        } else if (interaction && (interaction.type === 'move' || interaction.type === 'resize')) {
            if (onHistorySnapshot) onHistorySnapshot();
        }
        setIsDrawing(false);
        setCurrentRect(null);
        setInteraction(null);
    };

    return (
        <div
            ref={viewportRef}
            style={{
                width: '100%',
                flex: 1,
                minHeight: 0,
                overflow: 'auto',
                background: '#1a1a1a',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
                position: 'relative'
            }}
        >
            <div
                style={{
                    position: 'relative',
                    width: `${100 * zoom}%`,
                    margin: '0 auto',
                    cursor: editorMode === 'add' ? 'crosshair' : 'default',
                    userSelect: 'none',
                    transition: 'width 0.2s ease-out'
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                ref={containerRef}
            >
                <img
                    src={image}
                    alt="document"
                    style={{
                        width: '100%', height: 'auto', display: 'block', pointerEvents: 'none',
                        opacity: (tableRefining && showRegions) ? 0.3 : 1
                    }}
                />

                <svg style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    pointerEvents: 'none',
                    opacity: showRegions ? 1 : 0,
                    transition: 'opacity 0.2s'
                }}>
                    {regions.map(reg => {
                        const activeFilters = Object.entries(viewFilters).filter(([_, v]) => v).map(([k, _]) => k);
                        const isFiltered = activeFilters.length > 0 && !activeFilters.includes(reg.type.toLowerCase());
                        if (isFiltered) return null;

                        const config = TYPE_CONFIG[reg.type?.toLowerCase()] || TYPE_CONFIG['custom'];
                        const isSelected = selectedId === reg.id;
                        const isFaded = tableRefining && tableRefining.id !== reg.id;

                        if (isFaded) return null;

                        return (
                            <g key={reg.id}>


                                {/* 2. Main Box Interaction Hit Area */}
                                <rect
                                    x={`${reg.x * 100}%`}
                                    y={`${reg.y * 100}%`}
                                    width={`${reg.width * 100}%`}
                                    height={`${reg.height * 100}%`}
                                    fill="transparent"
                                    style={{
                                        pointerEvents: 'auto',
                                        cursor: tableRefining ? 'default' : 'move',
                                        stroke: 'transparent',
                                        strokeWidth: 15 / zoom
                                    }}
                                    onMouseDown={(e) => !tableRefining && startMove(e, reg.id)}
                                />

                                <rect
                                    x={`${reg.x * 100}%`}
                                    y={`${reg.y * 100}%`}
                                    width={`${reg.width * 100}%`}
                                    height={`${reg.height * 100}%`}
                                    fill={isSelected ? `${config.color}33` : `${config.color}11`}
                                    stroke={config.color}
                                    strokeWidth={isSelected ? 3 : 2}
                                    style={{ pointerEvents: 'none' }}
                                />

                                {tableRefining && tableRefining.id === reg.id && (
                                    <g>
                                        {tableRefining.cells?.map((cell, idx) => (
                                            <rect
                                                key={`cell-${idx}`}
                                                x={`${(reg.x + cell.x * reg.width) * 100}%`}
                                                y={`${(reg.y + cell.y * reg.height) * 100}%`}
                                                width={`${cell.w * reg.width * 100}%`}
                                                height={`${cell.h * reg.height * 100}%`}
                                                fill="rgba(59, 130, 246, 0.05)"
                                                stroke="rgba(59, 130, 246, 0.2)"
                                                strokeWidth={1}
                                            />
                                        ))}
                                        {tableRefining.cols.map((colX, idx) => (
                                            <line
                                                key={`col-line-${idx}`}
                                                x1={`${(reg.x + colX * reg.width) * 100}%`}
                                                y1={`${reg.y * 100}%`}
                                                x2={`${(reg.x + colX * reg.width) * 100}%`}
                                                y2={`${(reg.y + reg.height) * 100}%`}
                                                stroke="rgba(16, 185, 129, 0.8)"
                                                strokeWidth={1.5}
                                                style={{ pointerEvents: 'none' }}
                                            />
                                        ))}
                                        {tableRefining.rows.map((rowY, idx) => (
                                            <line
                                                key={`row-line-${idx}`}
                                                x1={`${reg.x * 100}%`}
                                                y1={`${(reg.y + rowY * reg.height) * 100}%`}
                                                x2={`${(reg.x + reg.width) * 100}%`}
                                                y2={`${(reg.y + rowY * reg.height) * 100}%`}
                                                stroke="rgba(16, 185, 129, 0.8)"
                                                strokeWidth={1.5}
                                                style={{ pointerEvents: 'none' }}
                                            />
                                        ))}
                                        {tableRefining.cols.map((colX, idx) => {
                                            const isBorder = idx === 0 || idx === tableRefining.cols.length - 1;
                                            return (
                                                <line
                                                    key={`col-hit-${idx}`}
                                                    x1={`${(reg.x + colX * reg.width) * 100}%`}
                                                    y1={`${reg.y * 100}%`}
                                                    x2={`${(reg.x + colX * reg.width) * 100}%`}
                                                    y2={`${(reg.y + reg.height) * 100}%`}
                                                    stroke="transparent"
                                                    strokeWidth={12}
                                                    style={{ pointerEvents: 'auto', cursor: isBorder ? 'default' : 'col-resize' }}
                                                    onMouseDown={(e) => startTableLineMove(e, 'col', idx, colX)}
                                                />
                                            );
                                        })}
                                        {tableRefining.rows.map((rowY, idx) => {
                                            const isBorder = idx === 0 || idx === tableRefining.rows.length - 1;
                                            return (
                                                <line
                                                    key={`row-hit-${idx}`}
                                                    x1={`${reg.x * 100}%`}
                                                    y1={`${(reg.y + rowY * reg.height) * 100}%`}
                                                    x2={`${(reg.x + reg.width) * 100}%`}
                                                    y2={`${(reg.y + rowY * reg.height) * 100}%`}
                                                    stroke="transparent"
                                                    strokeWidth={12}
                                                    style={{ pointerEvents: 'auto', cursor: isBorder ? 'default' : 'row-resize' }}
                                                    onMouseDown={(e) => startTableLineMove(e, 'row', idx, rowY)}
                                                />
                                            );
                                        })}
                                        {tableRefining.cols.map((colX, idx) => {
                                            const isBorder = idx === 0 || idx === tableRefining.cols.length - 1;
                                            if (isBorder) return null;
                                            return (
                                                <g
                                                    key={`col-del-${idx}`}
                                                    onMouseDown={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        deleteTableLine(e, 'col', idx);
                                                    }}
                                                    style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                                                >
                                                    <circle
                                                        cx={`${(reg.x + colX * reg.width) * 100}%`}
                                                        cy={`${(reg.y + reg.height) * 100}%`}
                                                        r={10}
                                                        fill="#ef4444"
                                                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                                                    />
                                                    <text
                                                        x={`${(reg.x + colX * reg.width) * 100}%`}
                                                        y={`${(reg.y + reg.height) * 100}%`}
                                                        fill="white"
                                                        fontSize={14}
                                                        fontWeight="bold"
                                                        textAnchor="middle"
                                                        dominantBaseline="middle"
                                                        style={{ pointerEvents: 'none' }}
                                                    >-</text>
                                                </g>
                                            );
                                        })}
                                        {tableRefining.rows.map((rowY, idx) => {
                                            const isBorder = idx === 0 || idx === tableRefining.rows.length - 1;
                                            if (isBorder) return null;
                                            return (
                                                <g
                                                    key={`row-del-${idx}`}
                                                    onMouseDown={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        deleteTableLine(e, 'row', idx);
                                                    }}
                                                    style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                                                >
                                                    <circle
                                                        cx={`${(reg.x + reg.width) * 100}%`}
                                                        cy={`${(reg.y + rowY * reg.height) * 100}%`}
                                                        r={10}
                                                        fill="#ef4444"
                                                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                                                    />
                                                    <text
                                                        x={`${(reg.x + reg.width) * 100}%`}
                                                        y={`${(reg.y + rowY * reg.height) * 100}%`}
                                                        fill="white"
                                                        fontSize={14}
                                                        fontWeight="bold"
                                                        textAnchor="middle"
                                                        dominantBaseline="middle"
                                                        style={{ pointerEvents: 'none' }}
                                                    >-</text>
                                                </g>
                                            );
                                        })}
                                    </g>
                                )}

                                {/* 1. Label rendered here to stay on top of borders but below handles */}
                                <foreignObject
                                    x={`${reg.x * 100}%`}
                                    y={`${reg.y * 100 - (reg.y < 0.05 ? 0 : 0.015) / zoom * 100}%`}
                                    width={200}
                                    height={30}
                                    style={{
                                        overflow: 'visible',
                                        pointerEvents: 'none' // Container doesn't block events
                                    }}
                                >
                                    <div
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            padding: `2px 8px`,
                                            background: config.color,
                                            color: '#fff',
                                            fontSize: `11px`,
                                            fontWeight: 'bold',
                                            borderRadius: '3px 3px 3px 0',
                                            whiteSpace: 'nowrap',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                            opacity: 0.9,
                                            transformOrigin: 'top left',
                                            gap: `6px`,
                                            cursor: 'default',
                                            pointerEvents: 'auto' // Only label content captures events
                                        }}
                                    >
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onToggleLock && onToggleLock(reg.id);
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: `18px`,
                                                height: `18px`,
                                                borderRadius: '50%',
                                                background: reg.locked ? '#8b5cf6' : 'rgba(255,255,255,0.2)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                border: reg.locked ? '1px solid #fff' : 'none'
                                            }}
                                        >
                                            {reg.locked ? (
                                                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                                </svg>
                                            ) : (
                                                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                                    <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                                                </svg>
                                            )}
                                        </div>
                                        <span style={{ pointerEvents: 'none' }}>
                                            {(() => {
                                                const isGenericLabel = !reg.label || reg.label.toLowerCase() === reg.type.toLowerCase();
                                                return isGenericLabel ? config.label : reg.label;
                                            })()}
                                        </span>
                                    </div>
                                </foreignObject>

                                {/* 3. Handles (Rendered later to be on top) */}
                                {isSelected && !tableRefining && !reg.locked && ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map(handle => {
                                    let hx = reg.x, hy = reg.y;
                                    if (handle.includes('e')) hx += reg.width;
                                    if (handle.includes('se') || handle.includes('sw') || handle === 's') hy += reg.height;
                                    if (handle === 'n' || handle === 's') hx += reg.width / 2;
                                    if (handle === 'e' || handle === 'w') hy += reg.height / 2;
                                    if (handle === 'ne') hx = reg.x + reg.width;

                                    const scaledHandleSize = HANDLE_SIZE / zoom;
                                    const hitAreaSize = Math.max(24, 30 / zoom);

                                    return (
                                        <g key={handle}>
                                            <rect
                                                x={`calc(${hx * 100}% - ${hitAreaSize / 2}px)`}
                                                y={`calc(${hy * 100}% - ${hitAreaSize / 2}px)`}
                                                width={hitAreaSize}
                                                height={hitAreaSize}
                                                fill="transparent"
                                                style={{ pointerEvents: 'auto', cursor: `${handle}-resize` }}
                                                onMouseDown={(e) => startResize(e, reg.id, handle)}
                                            />
                                            <rect
                                                x={`calc(${hx * 100}% - ${scaledHandleSize / 2}px)`}
                                                y={`calc(${hy * 100}% - ${scaledHandleSize / 2}px)`}
                                                width={scaledHandleSize}
                                                height={scaledHandleSize}
                                                fill="#fff"
                                                stroke={config.color}
                                                strokeWidth={1}
                                                style={{ pointerEvents: 'none' }}
                                            />
                                        </g>
                                    );
                                })}

                                {/* 4. Delete and other buttons (Rendered last) */}
                                {isSelected && !tableRefining && onDelete && !reg.locked && (
                                    <g
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(reg.id);
                                        }}
                                        style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                                    >
                                        <circle
                                            cx={`${(reg.x + reg.width) * 100}%`}
                                            cy={`${reg.y * 100}%`}
                                            r={9}
                                            fill="#ef4444"
                                            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
                                        />
                                        <text
                                            x={`${(reg.x + reg.width) * 100}%`}
                                            y={`${reg.y * 100}%`}
                                            fill="white"
                                            fontSize={12}
                                            fontWeight="bold"
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                        >-</text>
                                    </g>
                                )}
                            </g>
                        );
                    })}

                    {isDrawing && currentRect && (
                        <rect
                            x={`${(currentRect.width < 0 ? currentRect.x + currentRect.width : currentRect.x) * 100}%`}
                            y={`${(currentRect.height < 0 ? currentRect.y + currentRect.height : currentRect.y) * 100}%`}
                            width={`${Math.abs(currentRect.width) * 100}%`}
                            height={`${Math.abs(currentRect.height) * 100}%`}
                            fill="rgba(59, 130, 246, 0.1)"
                            stroke="var(--primary-color)"
                            strokeWidth={2}
                            strokeDasharray={`4 4`}
                        />
                    )}

                    {addLineHover && tableRefining && (
                        <g
                            style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                            onClick={(e) => addTableLine(e, addLineHover.type, addLineHover.val)}
                        >
                            <circle
                                cx={`${addLineHover.x * 100}%`}
                                cy={`${addLineHover.y * 100}%`}
                                r={12}
                                fill="#3b82f6"
                                stroke="#fff"
                                strokeWidth={2}
                                style={{ filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.6))' }}
                            />
                            <text
                                x={`${addLineHover.x * 100}%`}
                                y={`${addLineHover.y * 100}%`}
                                fill="white"
                                fontSize={16}
                                fontWeight="bold"
                                textAnchor="middle"
                                dominantBaseline="middle"
                                style={{ pointerEvents: 'none' }}
                            >+</text>
                            <line
                                x1={addLineHover.type === 'col' ? `${addLineHover.x * 100}%` : `${regions.find(r => r.id === tableRefining.id).x * 100}%`}
                                y1={addLineHover.type === 'row' ? `${addLineHover.y * 100}%` : `${regions.find(r => r.id === tableRefining.id).y * 100}%`}
                                x2={addLineHover.type === 'col' ? `${addLineHover.x * 100}%` : `${(regions.find(r => r.id === tableRefining.id).x + regions.find(r => r.id === tableRefining.id).width) * 100}%`}
                                y2={addLineHover.type === 'row' ? `${addLineHover.y * 100}%` : `${(regions.find(r => r.id === tableRefining.id).y + regions.find(r => r.id === tableRefining.id).height) * 100}%`}
                                stroke="#3b82f6"
                                strokeWidth={1}
                                strokeDasharray={`4 4`}
                                opacity={0.6}
                                pointerEvents="none"
                            />
                        </g>
                    )}
                </svg>
            </div>
        </div>
    );
};

export default DocumentEditor;
export { TYPE_CONFIG };
