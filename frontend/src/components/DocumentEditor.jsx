import React, { useState, useRef, useEffect, useCallback } from 'react';

const TYPE_CONFIG = {
    'title': { label: '标题', color: '#60a5fa' },
    'table': { label: '表格', color: '#10b981' },
    'plain text': { label: '普通正文', color: '#94a3b8' },
    'text': { label: '文字', color: '#94a3b8' },
    'abandon': { label: '无效区域', color: '#ef4444' },
    'figure': { label: '图片/插图', color: '#f59e0b' },
    'list': { label: '列表', color: '#ec4899' },
    'header': { label: '页眉', color: '#8b5cf6' },
    'footer': { label: '页脚', color: '#6366f1' },
    'equation': { label: '数学公式', color: '#10b981' },
    'table caption': { label: '表格标题', color: '#0ea5e9' },
    'figure caption': { label: '图片标题', color: '#f97316' },
    'custom': { label: '自定义区域', color: '#f43f5e' }
};

const HANDLE_SIZE = 8;

const DocumentEditor = ({
    image, regions, setRegions, selectedId, setSelectedId, editorMode = 'view',
    tableRefining = null, setTableRefining = null, onAnalyze = null, onSettingsChange = null,
    zoom = 1.0,
    showRegions = true
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
            setIsDrawing(true);
            setSelectedId(null);
            setCurrentRect({
                x, y, width: 0, height: 0,
                id: `custom_${Date.now()}`,
                type: 'custom',
                label: ''
            });
            return;
        }
    };

    const startResize = (e, id, handle) => {
        e.stopPropagation();
        const { x, y } = getCoordinates(e);
        const region = regions.find(r => r.id === id);
        setInteraction({ type: 'resize', id, handle, startX: x, startY: y, initialRegion: { ...region } });
    };

    const startMove = (e, id) => {
        e.stopPropagation();
        setSelectedId(id);
        const { x, y } = getCoordinates(e);
        const region = regions.find(r => r.id === id);
        setInteraction({ type: 'move', id, startX: x, startY: y, initialRegion: { ...region } });
    };

    const startTableLineMove = (e, type, index, val) => {
        e.stopPropagation();
        // Prevent moving outer borders (index 0 and length-1)
        if (type === 'col' && (index === 0 || index === tableRefining.cols.length - 1)) return;
        if (type === 'row' && (index === 0 || index === tableRefining.rows.length - 1)) return;

        setInteraction({ type: 'tableLine', lineType: type, index, startVal: val });
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

        if (!interaction) return;

        if (interaction.type === 'tableLine' && tableRefining) {
            const reg = regions.find(r => r.id === tableRefining.id);
            if (!reg) return;

            let newVal;
            if (interaction.lineType === 'col') {
                // Ensure within bounds (0-1 relative to bbox)
                const relX = (x - reg.x) / reg.width;
                newVal = Math.max(0.01, Math.min(0.99, relX));

                const newCols = [...tableRefining.cols];
                newCols[interaction.index] = newVal;
                // Maintain sort? Actually pdfplumber expects sorted, but let's sort on release or just keep dragging index
                // It's better to update visuals instantly. 
                // Don't sort while dragging to avoid index jumping
                setTableRefining({ ...tableRefining, cols: newCols });
            } else {
                const relY = (y - reg.y) / reg.height;
                newVal = Math.max(0.01, Math.min(0.99, relY));

                const newRows = [...tableRefining.rows];
                newRows[interaction.index] = newVal;
                setTableRefining({ ...tableRefining, rows: newRows });
            }
            return;
        }

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

        // Cannot delete borders
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
            newSettings.explicit_horizontal_lines = tableRefining.rows; // Keep rows as is
        } else {
            const newRows = tableRefining.rows.filter((_, i) => i !== index);
            setTableRefining({ ...tableRefining, rows: newRows });
            newSettings.explicit_horizontal_lines = newRows;
            newSettings.explicit_vertical_lines = tableRefining.cols; // Keep cols as is
        }

        onAnalyze(newSettings);
        // Notify parent to update dropdown to Explicit
        if (onSettingsChange) onSettingsChange({ vertical_strategy: 'explicit', horizontal_strategy: 'explicit' });
    };

    const handleMouseUp = () => {
        if (interaction?.type === 'tableLine' && tableRefining && onAnalyze) {
            // Commit the change by re-analyzing with explicit lines
            const newSettings = {
                ...tableRefining.settings,
                vertical_strategy: "explicit",
                horizontal_strategy: "explicit",
                explicit_vertical_lines: tableRefining.cols,
                explicit_horizontal_lines: tableRefining.rows
            };
            onAnalyze(newSettings);
            // Notify parent to update dropdown to Explicit
            if (onSettingsChange) onSettingsChange({ vertical_strategy: 'explicit', horizontal_strategy: 'explicit' });
        }

        if (isDrawing && currentRect && Math.abs(currentRect.width) > 0.005) {
            const normalized = {
                ...currentRect,
                x: currentRect.width < 0 ? currentRect.x + currentRect.width : currentRect.x,
                y: currentRect.height < 0 ? currentRect.y + currentRect.height : currentRect.y,
                width: Math.abs(currentRect.width),
                height: Math.abs(currentRect.height)
            };
            setRegions([...regions, normalized]);
            setSelectedId(normalized.id);
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
                flex: 1, // Use flex to fill parent
                minHeight: '600px', // Maintain minimum height
                overflow: 'auto',
                background: '#1a1a1a',
                borderRadius: '12px',
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
                        const config = TYPE_CONFIG[reg.type?.toLowerCase()] || TYPE_CONFIG['custom'];
                        const isSelected = selectedId === reg.id;
                        const isFaded = tableRefining && tableRefining.id !== reg.id;

                        if (isFaded) return null;

                        return (
                            <g key={reg.id}>
                                <rect
                                    x={`${reg.x * 100}%`}
                                    y={`${reg.y * 100}%`}
                                    width={`${reg.width * 100}%`}
                                    height={`${reg.height * 100}%`}
                                    fill={isSelected ? `${config.color}33` : `${config.color}11`}
                                    stroke={config.color}
                                    strokeWidth={isSelected ? (2 / zoom) : (1.5 / zoom)} // Adjust stroke weight for zoom
                                    style={{ pointerEvents: 'auto', cursor: tableRefining ? 'default' : 'move' }}
                                    onMouseDown={(e) => !tableRefining && startMove(e, reg.id)}
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
                                                strokeWidth={0.5 / zoom}
                                            />
                                        ))}
                                        {tableRefining.cols.map((colX, idx) => {
                                            const isBorder = idx === 0 || idx === tableRefining.cols.length - 1;
                                            return (
                                                <g key={`col-${idx}`}>
                                                    {/* Invisible hit area */}
                                                    <line
                                                        x1={`${(reg.x + colX * reg.width) * 100}%`}
                                                        y1={`${reg.y * 100}%`}
                                                        x2={`${(reg.x + colX * reg.width) * 100}%`}
                                                        y2={`${(reg.y + reg.height) * 100}%`}
                                                        stroke="transparent"
                                                        strokeWidth={10 / zoom}
                                                        style={{ pointerEvents: 'auto', cursor: isBorder ? 'default' : 'col-resize' }}
                                                        onMouseDown={(e) => startTableLineMove(e, 'col', idx, colX)}
                                                    />
                                                    {/* Visible line */}
                                                    <line
                                                        x1={`${(reg.x + colX * reg.width) * 100}%`}
                                                        y1={`${reg.y * 100}%`}
                                                        x2={`${(reg.x + colX * reg.width) * 100}%`}
                                                        y2={`${(reg.y + reg.height) * 100}%`}
                                                        stroke="rgba(16, 185, 129, 0.8)"
                                                        strokeWidth={1.5 / zoom}
                                                        style={{ pointerEvents: 'none' }}
                                                    />
                                                    {/* Delete button (only for inner lines) */}
                                                    {!isBorder && (
                                                        <g
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
                                                                r={6 / zoom}
                                                                fill="#ef4444"
                                                            />
                                                            <text
                                                                x={`${(reg.x + colX * reg.width) * 100}%`}
                                                                y={`${(reg.y + reg.height) * 100}%`}
                                                                fill="white"
                                                                fontSize={10 / zoom}
                                                                textAnchor="middle"
                                                                dominantBaseline="middle"
                                                                style={{ pointerEvents: 'none' }}
                                                            >-</text>
                                                        </g>
                                                    )}
                                                </g>
                                            );
                                        })}
                                        {tableRefining.rows.map((rowY, idx) => {
                                            const isBorder = idx === 0 || idx === tableRefining.rows.length - 1;
                                            return (
                                                <g key={`row-${idx}`}>
                                                    {/* Invisible hit area */}
                                                    <line
                                                        x1={`${reg.x * 100}%`}
                                                        y1={`${(reg.y + rowY * reg.height) * 100}%`}
                                                        x2={`${(reg.x + reg.width) * 100}%`}
                                                        y2={`${(reg.y + rowY * reg.height) * 100}%`}
                                                        stroke="transparent"
                                                        strokeWidth={10 / zoom}
                                                        style={{ pointerEvents: 'auto', cursor: isBorder ? 'default' : 'row-resize' }}
                                                        onMouseDown={(e) => startTableLineMove(e, 'row', idx, rowY)}
                                                    />
                                                    {/* Visible line */}
                                                    <line
                                                        x1={`${reg.x * 100}%`}
                                                        y1={`${(reg.y + rowY * reg.height) * 100}%`}
                                                        x2={`${(reg.x + reg.width) * 100}%`}
                                                        y2={`${(reg.y + rowY * reg.height) * 100}%`}
                                                        stroke="rgba(16, 185, 129, 0.8)"
                                                        strokeWidth={1.5 / zoom}
                                                        style={{ pointerEvents: 'none' }}
                                                    />
                                                    {/* Delete button */}
                                                    {!isBorder && (
                                                        <g
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
                                                                r={6 / zoom}
                                                                fill="#ef4444"
                                                            />
                                                            <text
                                                                x={`${(reg.x + reg.width) * 100}%`}
                                                                y={`${(reg.y + rowY * reg.height) * 100}%`}
                                                                fill="white"
                                                                fontSize={10 / zoom}
                                                                textAnchor="middle"
                                                                dominantBaseline="middle"
                                                                style={{ pointerEvents: 'none' }}
                                                            >-</text>
                                                        </g>
                                                    )}

                                                </g>
                                            );
                                        })}
                                    </g>
                                )}

                                {isSelected && !tableRefining && ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map(handle => {
                                    let hx = reg.x, hy = reg.y;
                                    if (handle.includes('e')) hx += reg.width;
                                    if (handle.includes('se') || handle.includes('sw') || handle === 's') hy += reg.height;
                                    if (handle === 'n' || handle === 's') hx += reg.width / 2;
                                    if (handle === 'e' || handle === 'w') hy += reg.height / 2;
                                    if (handle === 'ne') hx = reg.x + reg.width;

                                    const scaledHandleSize = HANDLE_SIZE / zoom;

                                    return (
                                        <rect
                                            key={handle}
                                            x={`calc(${hx * 100}% - ${scaledHandleSize / 2}px)`}
                                            y={`calc(${hy * 100}% - ${scaledHandleSize / 2}px)`}
                                            width={scaledHandleSize}
                                            height={scaledHandleSize}
                                            fill="#fff"
                                            stroke={config.color}
                                            strokeWidth={1 / zoom}
                                            style={{ pointerEvents: 'auto', cursor: `${handle}-resize` }}
                                            onMouseDown={(e) => startResize(e, reg.id, handle)}
                                        />
                                    );
                                })}

                                {!tableRefining && (
                                    <foreignObject
                                        x={`${reg.x * 100}%`}
                                        y={`${reg.y * 100 - (reg.y < 0.05 ? 0 : 0.015) / zoom * 100}%`}
                                        width={150 / zoom}
                                        height={24 / zoom}
                                        style={{ overflow: 'visible', pointerEvents: 'none' }}
                                    >
                                        <div style={{
                                            display: 'inline-block',
                                            padding: `${1 / zoom}px ${6 / zoom}px`,
                                            background: config.color,
                                            color: '#fff',
                                            fontSize: `${10 / zoom}px`,
                                            fontWeight: 'bold',
                                            borderRadius: '3px 3px 3px 0',
                                            whiteSpace: 'nowrap',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                            opacity: 0.9,
                                            transformOrigin: 'top left'
                                        }}>
                                            {reg.label || config.label}
                                        </div>
                                    </foreignObject>
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
                            strokeWidth={2 / zoom}
                            strokeDasharray={`${4 / zoom} ${4 / zoom}`}
                        />
                    )}
                </svg>
            </div>
        </div>
    );
};

export default DocumentEditor;
export { TYPE_CONFIG };
