import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import { Heading, Grid3X3, AlignLeft, Type, Ban, Image, List, PanelTop, PanelBottom, Sigma, TextSelect, MessageSquareText, BoxSelect, Edit3, Anchor, X } from 'lucide-react';

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

// 确认的文本锚点组件：闪烁动画 + 蓝色虚线框 + 可移动外框
const ConfirmedTextAnchor = ({ corner, word, cornerHandle, flashCount, onFlashEnd, onHandleMove, onConfirm, getCoordinates }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [localFlashCount, setLocalFlashCount] = useState(flashCount);

    // 闪烁动画效果
    useEffect(() => {
        if (localFlashCount > 0) {
            const timer = setTimeout(() => {
                setLocalFlashCount(prev => prev - 1);
            }, 300);
            return () => clearTimeout(timer);
        } else if (flashCount > 0 && localFlashCount === 0) {
            onFlashEnd();
        }
    }, [localFlashCount, flashCount, onFlashEnd]);

    useEffect(() => {
        setLocalFlashCount(flashCount);
    }, [flashCount]);

    // 拖动手柄
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e) => {
            const coords = getCoordinates(e);
            onHandleMove(coords);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, getCoordinates, onHandleMove]);

    const isFlashing = localFlashCount > 0;



    return (
        <>
            {/* 文本锚点的虚线框 */}
            <div
                style={{
                    position: 'absolute',
                    left: `${word.x0 * 100}%`,
                    top: `${word.y0 * 100}%`,
                    width: `${(word.x1 - word.x0) * 100}%`,
                    height: `${(word.y1 - word.y0) * 100}%`,
                    border: isFlashing ? '3px solid #ef4444' : '2px dashed #3b82f6',
                    background: isFlashing ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                    boxShadow: isFlashing ? '0 0 12px rgba(239, 68, 68, 0.8)' : '0 0 8px rgba(59, 130, 246, 0.4)',
                    animation: isFlashing ? 'anchor-flash 0.3s ease-in-out' : 'none',
                    pointerEvents: 'none',
                    zIndex: 70
                }}
            />

            {/* 连接线 */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 71 }}>
                <line
                    x1={`${((word.x0 + word.x1) / 2) * 100}%`}
                    y1={`${((word.y0 + word.y1) / 2) * 100}%`}
                    x2={`${cornerHandle.x * 100}%`}
                    y2={`${cornerHandle.y * 100}%`}
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    opacity="0.8"
                />
            </svg>

            {/* 可拖动的角落手柄 (L-shape) */}
            <div
                onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setIsDragging(true);
                }}
                style={{
                    position: 'absolute',
                    left: `${cornerHandle.x * 100}%`,
                    top: `${cornerHandle.y * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    width: '32px',
                    height: '32px',
                    cursor: 'crosshair',
                    pointerEvents: 'auto',
                    zIndex: 80,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <div style={{ color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Anchor size={20} strokeWidth={2.5} />
                </div>
            </div>


        </>
    );
};

const DocumentEditor = ({
    image, regions, viewFilters = {}, setRegions, selectedId, setSelectedId, editorMode = 'view',
    tableRefining = null, setTableRefining = null, onAnalyze = null, onSettingsChange = null,
    zoom = 1.0,
    setZoom = null,
    showRegions = true,
    onDelete = null,
    onToggleLock = null,
    onHistorySnapshot = null,
    selectedIds = [], // Array of selected IDs
    setSelectedIds = null,
    positioningMode = false,
    setPositioningMode = null,
    words = []
}) => {

    const [interaction, setInteraction] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentRect, setCurrentRect] = useState(null);
    const [shiftPressed, setShiftPressed] = useState(false);
    const [altPressed, setAltPressed] = useState(false);
    const containerRef = useRef(null);
    const viewportRef = useRef(null);

    // --- Dynamic Positioning Internal State ---
    // cornerMode: null, 'picking_text'
    const [posState, setPosState] = useState({
        activeCorner: null, // 'tl', 'tr', 'bl', 'br'
        mode: null,
        hoverWord: null,
        draggingAnchor: null, // { corner, initialX, initialY, initialOffset }
        confirmedAnchor: null, // 已确认的锚点 { word, cornerHandle: {x, y} }
        flashCount: 0, // 闪烁计数器
        flashingWord: null // 当前正在闪烁确认的单词
    });

    // 进入捕获模式（不再放大）


    const exitCaptureMode = () => {
        setPosState(prev => ({
            ...prev,
            mode: null,
            activeCorner: null,
            confirmedAnchor: null,
            flashCount: 0,
            flashingWord: null
        }));
    };

    // 捕获反馈闪烁逻辑
    useEffect(() => {
        if (posState.flashCount > 0) {
            const timer = setTimeout(() => {
                setPosState(prev => ({ ...prev, flashCount: prev.flashCount - 1 }));
            }, 100); // 100ms 一次闪烁
            return () => clearTimeout(timer);
        } else if (posState.flashingWord) {
            // 闪烁结束，正式设置锚点
            handleSetTextAnchor(posState.flashingWord);
            setPosState(prev => ({ ...prev, flashingWord: null }));
        }
    }, [posState.flashCount, posState.flashingWord]);

    const selectedRegion = regions.find(r => r.id === selectedId) || (selectedIds.length === 1 ? regions.find(r => r.id === selectedIds[0]) : null);

    const handleSetTextAnchor = (word) => {
        if (!selectedRegion || !posState.activeCorner) return;

        const nextRegions = regions.map(r => {
            if (r.id !== selectedRegion.id) return r;
            const positioning = { ...(r.positioning || {}) };
            const anchors = { ...(positioning.anchors || {}) };

            // Calculate relative offset of current corner to anchor word center
            let cx = r.x, cy = r.y;
            if (posState.activeCorner.includes('r')) cx += r.width;
            if (posState.activeCorner.includes('b')) cy += r.height;

            const ax = (word.x0 + word.x1) / 2;
            const ay = (word.y0 + word.y1) / 2;

            anchors[posState.activeCorner] = {
                type: 'text',
                text: word.text,
                bounds: [word.x0, word.y0, word.x1, word.y1],
                offset_x: cx - ax,
                offset_y: cy - ay
            };

            return { ...r, positioning: { ...positioning, anchors } };
        });

        setRegions(nextRegions);
        exitCaptureMode();
        if (onHistorySnapshot) onHistorySnapshot(nextRegions);
    };



    const getCoordinates = (e) => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        // Clamp coordinates to [0, 1] to prevent going out of bounds
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        return { x, y };
    };

    const handleMouseDown = (e) => {
        const { x, y } = getCoordinates(e);
        if (tableRefining) return; // Interaction handled by lines if refining

        if (positioningMode) {

            return;
        }

        if (editorMode === 'add' && (e.target === containerRef.current || e.target.tagName === 'svg')) {
            // 计算当前已有的 custom 区块数量,从 0 开始编号(和 auto 编号规则一致)
            const customCount = regions.filter(r => r.id && r.id.startsWith('custom_')).length;
            const newId = `custom_${customCount}`;

            setIsDrawing(true);
            setSelectedId(null);
            if (setSelectedIds) setSelectedIds([]);
            setCurrentRect({
                x, y, width: 0, height: 0,
                id: newId,
                type: 'custom',
                label: ''
            });
            return;
        }

        if (editorMode === 'select' && (e.target === containerRef.current || e.target.tagName === 'svg')) {
            setIsDrawing(true);

            if (e.shiftKey) {
                // Modified mode: ADD
                const customCount = regions.filter(r => r.id && r.id.startsWith('custom_')).length;
                const newId = `custom_${customCount}`;
                setSelectedId(null);
                if (setSelectedIds) setSelectedIds([]);
                setCurrentRect({
                    x, y, width: 0, height: 0,
                    id: newId,
                    type: 'custom',
                    label: '',
                    isModifiedMode: 'add'
                });
            } else if (e.altKey) {
                // Modified mode: DELETE
                setSelectedId(null);
                if (setSelectedIds) setSelectedIds([]);
                setCurrentRect({
                    x, y, width: 0, height: 0,
                    type: 'deletion_box',
                    isModifiedMode: 'delete'
                });
            } else {
                // Normal SELECT functionality
                if (setSelectedIds) setSelectedIds([]);
                setSelectedId(null);
                setCurrentRect({
                    x, y, width: 0, height: 0,
                    type: 'selection_box'
                });
            }
            return;
        }

        // Click on background in View mode -> Clear selection
        if (editorMode === 'view' && (e.target === containerRef.current || e.target.tagName === 'svg')) {
            setSelectedId(null);
            if (setSelectedIds) setSelectedIds([]);
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

        // Handle selection logic on click/down
        let newSelectedIds = selectedIds ? [...selectedIds] : [];
        if (setSelectedIds) {
            if (editorMode === 'select') {
                // Logic for select mode: toggle or add?
                // If simply clicking (mousedown) on an item not yet selected, and not holding shift, maybe select it?
                if (!newSelectedIds.includes(id)) {
                    if (!e.shiftKey) {
                        newSelectedIds = [id];
                    } else {
                        newSelectedIds.push(id);
                    }
                    setSelectedIds(newSelectedIds);
                }
            } else {
                // Normal view mode
                setSelectedIds([id]);
                newSelectedIds = [id];
            }
        }
        setSelectedId(id);

        const region = regions.find(r => r.id === id);
        if (region && region.locked) return; // Prevent moving if locked

        // Prepare initial positions for ALL selected regions (for batch move)
        const movingRegions = newSelectedIds.map(rid => {
            const r = regions.find(reg => reg.id === rid);
            // Only include if found and not locked
            return (r && !r.locked) ? { ...r } : null;
        }).filter(Boolean);

        const { x, y } = getCoordinates(e);
        setInteraction({
            type: 'move',
            id,
            startX: x,
            startY: y,
            initialRegion: { ...region },
            initialRegionsMap: movingRegions.reduce((acc, r) => ({ ...acc, [r.id]: r }), {})
        });
    };

    const tableRefiningRef = useRef(tableRefining);
    useEffect(() => {
        tableRefiningRef.current = tableRefining;
    }, [tableRefining]);

    const startTableLineMove = (e, type, index, val) => {
        e.stopPropagation();
        e.preventDefault();

        // Locking Check
        const settings = tableRefining?.settings || {};
        if (type === 'col' && (settings.vertical_locked || index === 0 || index === tableRefining.cols.length - 1)) return;
        if (type === 'row' && (settings.horizontal_locked || index === 0 || index === tableRefining.rows.length - 1)) return;

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
                const currentSettings = finalRefining.settings || {};
                const newSettings = {
                    ...currentSettings,
                    explicit_vertical_lines: finalRefining.cols,
                    explicit_horizontal_lines: finalRefining.rows
                };

                // Decoupled Strategy Switching
                if (type === 'col') {
                    newSettings.vertical_strategy = "explicit";
                    if (onSettingsChange) onSettingsChange({ vertical_strategy: 'explicit' });
                } else {
                    newSettings.horizontal_strategy = "explicit";
                    if (onSettingsChange) onSettingsChange({ horizontal_strategy: 'explicit' });
                }

                onAnalyze(newSettings);
            }
        };

        document.addEventListener('mousemove', handleDocMouseMove);
        document.addEventListener('mouseup', handleDocMouseUp);
    };

    const [addLineHover, setAddLineHover] = useState(null);

    const addTableLine = (e, type, val) => {
        e.stopPropagation();
        if (!tableRefining || !onAnalyze) return;

        // Locking Check
        const settings = tableRefining.settings || {};
        if (type === 'col' && settings.vertical_locked) return;
        if (type === 'row' && settings.horizontal_locked) return;

        let newSettings = {
            ...settings,
            explicit_vertical_lines: tableRefining.cols, // Default to current
            explicit_horizontal_lines: tableRefining.rows // Default to current
        };

        if (type === 'col') {
            const newCols = [...tableRefining.cols, val].sort((a, b) => a - b);
            setTableRefining({ ...tableRefining, cols: newCols });
            newSettings.explicit_vertical_lines = newCols;
            newSettings.vertical_strategy = "explicit";
            if (onSettingsChange) onSettingsChange({ vertical_strategy: 'explicit' });
        } else {
            const newRows = [...tableRefining.rows, val].sort((a, b) => a - b);
            setTableRefining({ ...tableRefining, rows: newRows });
            newSettings.explicit_horizontal_lines = newRows;
            newSettings.horizontal_strategy = "explicit";
            if (onSettingsChange) onSettingsChange({ horizontal_strategy: 'explicit' });
        }

        onAnalyze(newSettings);
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

        // Handle Anchor Picking Drag
        if (posState.mode === 'picking_text' && posState.dragStart) {
            setPosState(prev => ({ ...prev, currentDrag: { x, y } }));

            // Look for OCR word under mouse
            const hoverWord = words.find(w =>
                x >= w.x0 && x <= w.x1 && y >= w.y0 && y <= w.y1
            );
            if (hoverWord !== posState.hoverWord) {
                setPosState(prev => ({ ...prev, hoverWord }));
            }
            return;
        }

        if (!interaction) {
            if (posState.draggingAnchor) {
                const dx = x - posState.draggingAnchor.initialMouseX;
                const dy = y - posState.draggingAnchor.initialMouseY;
                const corner = posState.draggingAnchor.corner;

                const nextRegions = regions.map(r => {
                    if (r.id !== selectedRegion.id) return r;
                    const positioning = { ...(r.positioning || {}) };
                    const anchors = { ...(positioning.anchors || {}) };
                    const anchor = { ...anchors[corner] };

                    anchor.offset_x = posState.draggingAnchor.initialOffsetX + dx;
                    anchor.offset_y = posState.draggingAnchor.initialOffsetY + dy;
                    anchors[corner] = anchor;

                    // 同步更新 Region 的 Geometry
                    let { x: rx, y: ry, width: rw, height: rh } = r;
                    const rb = ry + rh;
                    const rr = rx + rw;

                    // 获取锚点中心
                    let ax0, ay0, ax1, ay1;
                    if (anchor.type === 'text') {
                        [ax0, ay0, ax1, ay1] = anchor.bounds;
                    } else {
                        ({ x0: ax0, y0: ay0, x1: ax1, y1: ay1 } = anchor.bounds);
                    }
                    const ax = (ax0 + ax1) / 2;
                    const ay = (ay0 + ay1) / 2;

                    // 计算新的角坐标
                    const ncx = ax + anchor.offset_x;
                    const ncy = ay + anchor.offset_y;

                    if (corner === 'tl') {
                        rx = ncx; ry = ncy;
                        rw = Math.max(0.001, rr - rx); rh = Math.max(0.001, rb - ry);
                    } else if (corner === 'tr') {
                        ry = ncy;
                        rw = Math.max(0.001, ncx - rx); rh = Math.max(0.001, rb - ry);
                    } else if (corner === 'bl') {
                        rx = ncx;
                        rw = Math.max(0.001, rr - rx); rh = Math.max(0.001, ncy - ry);
                    } else if (corner === 'br') {
                        rw = Math.max(0.001, ncx - rx); rh = Math.max(0.001, ncy - ry);
                    }

                    return { ...r, x: rx, y: ry, width: rw, height: rh, positioning: { ...positioning, anchors } };
                });
                setRegions(nextRegions);
                return;
            }
            return;
        }

        if (interaction.type === 'move') {
            const dx = x - interaction.startX;
            const dy = y - interaction.startY;

            // Batch Move
            if (interaction.initialRegionsMap) {
                setRegions(prev => prev.map(r => {
                    const initR = interaction.initialRegionsMap[r.id];
                    if (initR) {
                        return {
                            ...r,
                            x: Math.max(0, Math.min(1 - r.width, initR.x + dx)),
                            y: Math.max(0, Math.min(1 - r.height, initR.y + dy))
                        };
                    }
                    return r;
                }));
            } else {
                // Fallback single move
                setRegions(prev => prev.map(r => r.id === interaction.id ? {
                    ...r,
                    x: Math.max(0, Math.min(1 - r.width, interaction.initialRegion.x + dx)),
                    y: Math.max(0, Math.min(1 - r.height, interaction.initialRegion.y + dy))
                } : r));
            }

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

        // Locking Check
        const settings = tableRefining.settings || {};
        if (type === 'col' && (settings.vertical_locked || index === 0 || index === tableRefining.cols.length - 1)) return;
        if (type === 'row' && (settings.horizontal_locked || index === 0 || index === tableRefining.rows.length - 1)) return;

        let newSettings = {
            ...settings,
            explicit_vertical_lines: tableRefining.cols,
            explicit_horizontal_lines: tableRefining.rows
        };

        if (type === 'col') {
            const newCols = tableRefining.cols.filter((_, i) => i !== index);
            setTableRefining({ ...tableRefining, cols: newCols });
            newSettings.explicit_vertical_lines = newCols;
            newSettings.vertical_strategy = "explicit";
            if (onSettingsChange) onSettingsChange({ vertical_strategy: 'explicit' });
        } else {
            const newRows = tableRefining.rows.filter((_, i) => i !== index);
            setTableRefining({ ...tableRefining, rows: newRows });
            newSettings.explicit_horizontal_lines = newRows;
            newSettings.horizontal_strategy = "explicit";
            if (onSettingsChange) onSettingsChange({ horizontal_strategy: 'explicit' });
        }

        onAnalyze(newSettings);
    };

    const handleMouseUp = useCallback(() => {
        // Handle Anchor Picking Completion
        if (posState.mode === 'picking_text' && posState.dragStart) {
            if (posState.hoverWord) {
                // Trigger flash feedback before final save
                setPosState(prev => ({
                    ...prev,
                    mode: null,
                    dragStart: null,
                    currentDrag: null,
                    flashingWord: posState.hoverWord,
                    flashCount: 6 // 6 alternates = 3 full flashes
                }));
            } else {
                // Cancel drag
                setPosState(prev => ({ ...prev, mode: null, dragStart: null, currentDrag: null, activeCorner: null, hoverWord: null }));
            }
            return;
        }

        // Handle Box Selection Finalization
        if (isDrawing && currentRect && editorMode === 'select') {
            const selBox = {
                x: currentRect.width < 0 ? currentRect.x + currentRect.width : currentRect.x,
                y: currentRect.height < 0 ? currentRect.y + currentRect.height : currentRect.y,
                width: Math.abs(currentRect.width),
                height: Math.abs(currentRect.height)
            };

            const activeFilters = Object.entries(viewFilters || {}).filter(([_, v]) => v).map(([k, _]) => k);
            const visibleRegions = activeFilters.length === 0 ? regions : regions.filter(r => activeFilters.includes(r.type.toLowerCase()));

            // Find intersecting regions
            const intersectingIds = visibleRegions.filter(r => {
                const rRight = r.x + r.width;
                const rBottom = r.y + r.height;
                const boxRight = selBox.x + selBox.width;
                const boxBottom = selBox.y + selBox.height;

                // Check for intersection
                return !(r.x > boxRight || rRight < selBox.x || r.y > boxBottom || rBottom < selBox.y);
            }).map(r => r.id);

            if (currentRect.isModifiedMode === 'delete') {
                if (intersectingIds.length > 0 && onDelete) {
                    onDelete(intersectingIds);
                }
            } else if (currentRect.isModifiedMode === 'add') {
                if (Math.abs(currentRect.width) > 0.005) {
                    const normalized = {
                        ...currentRect,
                        x: currentRect.width < 0 ? currentRect.x + currentRect.width : currentRect.x,
                        y: currentRect.height < 0 ? currentRect.y + currentRect.height : currentRect.y,
                        width: Math.abs(currentRect.width),
                        height: Math.abs(currentRect.height)
                    };
                    // Remove internal properties
                    delete normalized.isModifiedMode;

                    const newRegions = [...regions, normalized];
                    setRegions(newRegions);
                    setSelectedId(normalized.id);
                    if (setSelectedIds) setSelectedIds([normalized.id]);
                    if (onHistorySnapshot) onHistorySnapshot(newRegions);
                }
            } else {
                if (setSelectedIds) setSelectedIds(intersectingIds);
                if (intersectingIds.length > 0) setSelectedId(intersectingIds[0]);
                else setSelectedId(null);
            }

        } else if (isDrawing && currentRect && Math.abs(currentRect.width) > 0.005 && editorMode === 'add') {
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
            if (setSelectedIds) setSelectedIds([normalized.id]);
            if (onHistorySnapshot) onHistorySnapshot(newRegions);
            // Image anchor logic removed
        } else if (posState.draggingAnchor) {
            if (onHistorySnapshot) onHistorySnapshot();
            setPosState(prev => ({ ...prev, draggingAnchor: null }));
        } else if (interaction && (interaction.type === 'move' || interaction.type === 'resize')) {
            if (onHistorySnapshot) onHistorySnapshot();
        }
        setIsDrawing(false);
        setCurrentRect(null);
        setInteraction(null);
    }, [isDrawing, currentRect, editorMode, regions, interaction, setRegions, setSelectedId, setSelectedIds, onHistorySnapshot, posState, handleSetTextAnchor, selectedRegion]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Shift') setShiftPressed(true);
            if (e.key === 'Alt' || e.key === 'Option') setAltPressed(true);
            if (e.key === 'Escape') {
                if (posState.mode) setPosState(prev => ({ ...prev, mode: null, activeCorner: null }));
                else if (positioningMode) setPositioningMode(false);
            }
        };
        const handleKeyUp = (e) => {
            if (e.key === 'Shift') setShiftPressed(false);
            if (e.key === 'Alt' || e.key === 'Option') setAltPressed(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    useEffect(() => {
        if (isDrawing || interaction) {
            const onGlobalMouseMove = (e) => {
                handleMouseMove(e);
            };
            const onGlobalMouseUp = () => {
                handleMouseUp();
            };

            document.addEventListener('mousemove', onGlobalMouseMove);
            document.addEventListener('mouseup', onGlobalMouseUp);
            return () => {
                document.removeEventListener('mousemove', onGlobalMouseMove);
                document.removeEventListener('mouseup', onGlobalMouseUp);
            };
        }
    }, [isDrawing, interaction, handleMouseMove, handleMouseUp]);

    return (
        <div
            ref={viewportRef}
            style={{
                width: '100%',
                flex: 1,
                minHeight: 0,
                overflow: 'auto',
                background: '#1a1a1a',
                borderRadius: '0',
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
                    cursor: editorMode === 'add' || (editorMode === 'select' && shiftPressed) ? 'crosshair' :
                        (editorMode === 'select' && altPressed) ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='17' height='17' viewBox='0 0 17 17'%3E%3Cline x1='1' y1='8.5' x2='16' y2='8.5' stroke='white' stroke-width='3' stroke-linecap='square'/%3E%3Cline x1='1' y1='8.5' x2='16' y2='8.5' stroke='black' stroke-width='1' stroke-linecap='square'/%3E%3C/svg%3E") 8 8, crosshair` :
                            (editorMode === 'select' ? 'cell' : 'default'),
                    userSelect: 'none',
                    transition: 'width 0.2s ease-out'
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
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
                    opacity: (showRegions && !(positioningMode && posState.mode === 'picking_text')) ? 1 : 0,
                    transition: 'opacity 0.2s'
                }}>
                    {regions.map(reg => {
                        const activeFilters = Object.entries(viewFilters).filter(([_, v]) => v).map(([k, _]) => k);
                        const isFiltered = activeFilters.length > 0 && !activeFilters.includes(reg.type.toLowerCase());
                        if (isFiltered) return null;

                        const config = TYPE_CONFIG[reg.type?.toLowerCase()] || TYPE_CONFIG['custom'];
                        const isSelected = selectedId === reg.id || (selectedIds && selectedIds.includes(reg.id));
                        const isFaded = tableRefining && tableRefining.id !== reg.id;
                        const isRefinedTable = reg.type === 'table' && reg.table_settings;

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
                                            const isLocked = tableRefining.settings?.vertical_locked;
                                            return (
                                                <line
                                                    key={`col-hit-${idx}`}
                                                    x1={`${(reg.x + colX * reg.width) * 100}%`}
                                                    y1={`${reg.y * 100}%`}
                                                    x2={`${(reg.x + colX * reg.width) * 100}%`}
                                                    y2={`${(reg.y + reg.height) * 100}%`}
                                                    stroke="transparent"
                                                    strokeWidth={12}
                                                    style={{ pointerEvents: isLocked ? 'none' : 'auto', cursor: isBorder || isLocked ? 'default' : 'col-resize' }}
                                                    onMouseDown={(e) => startTableLineMove(e, 'col', idx, colX)}
                                                />
                                            );
                                        })}
                                        {tableRefining.rows.map((rowY, idx) => {
                                            const isBorder = idx === 0 || idx === tableRefining.rows.length - 1;
                                            const isLocked = tableRefining.settings?.horizontal_locked;
                                            return (
                                                <line
                                                    key={`row-hit-${idx}`}
                                                    x1={`${reg.x * 100}%`}
                                                    y1={`${(reg.y + rowY * reg.height) * 100}%`}
                                                    x2={`${(reg.x + reg.width) * 100}%`}
                                                    y2={`${(reg.y + rowY * reg.height) * 100}%`}
                                                    stroke="transparent"
                                                    strokeWidth={12}
                                                    style={{ pointerEvents: isLocked ? 'none' : 'auto', cursor: isBorder || isLocked ? 'default' : 'row-resize' }}
                                                    onMouseDown={(e) => startTableLineMove(e, 'row', idx, rowY)}
                                                />
                                            );
                                        })}
                                        {tableRefining.cols.map((colX, idx) => {
                                            const isBorder = idx === 0 || idx === tableRefining.cols.length - 1;
                                            const isLocked = tableRefining.settings?.vertical_locked;
                                            if (isBorder || isLocked) return null;
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
                                            const isLocked = tableRefining.settings?.horizontal_locked;
                                            if (isBorder || isLocked) return null;
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
                                            pointerEvents: 'auto'
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
                                        {isRefinedTable && <Edit3 size={11} />}
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
                            fill={currentRect.type === 'crop_box' ? "rgba(245, 158, 11, 0.15)" :
                                currentRect.isModifiedMode === 'delete' ? "rgba(239, 68, 68, 0.15)" :
                                    currentRect.isModifiedMode === 'add' ? "rgba(16, 185, 129, 0.15)" :
                                        "rgba(59, 130, 246, 0.1)"}
                            stroke={currentRect.type === 'crop_box' ? "#f59e0b" :
                                currentRect.isModifiedMode === 'delete' ? "#ef4444" :
                                    currentRect.isModifiedMode === 'add' ? "#10b981" :
                                        "var(--primary-color)"}
                            strokeWidth={2}
                            strokeDasharray={currentRect.type === 'crop_box' ? "none" : "4 4"}
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

                {/* Positioning Mode Interaction Layer */}
                {positioningMode && selectedRegion && (
                    <div
                        style={{
                            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                            pointerEvents: (posState.mode === 'picking_text' || posState.confirmedAnchor) ? 'auto' : 'none',
                            background: 'transparent',
                            zIndex: 50
                        }}
                        onMouseDown={(e) => {
                            // 阻止冒泡到容器的 handleMouseDown
                            e.stopPropagation();
                            // 如果是图像框选模式，开始框选

                        }}
                    >
                        <style>{`
                            @keyframes anchor-breath {
                                0% { transform: scale(1); opacity: 0.8; }
                                50% { transform: scale(1.15); opacity: 1; }
                                100% { transform: scale(1); opacity: 0.8; }
                            }
                            @keyframes anchor-flash {
                                0%, 100% { border-color: #ef4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.8); }
                                50% { border-color: #fbbf24; box-shadow: 0 0 16px rgba(251, 191, 36, 1); }
                            }
                            .anchor-circle {
                                animation: anchor-breath 1.5s ease-in-out infinite;
                                transform-origin: center;
                                pointer-events: auto;
                                cursor: pointer;
                            }
                            .anchor-circle .anchor-icon {
                                opacity: 0;
                                transition: opacity 0.2s;
                            }
                            .anchor-circle:hover .anchor-icon {
                                opacity: 1;
                            }
                            .anchor-circle:hover .anchor-dot {
                                opacity: 0;
                            }
                            .anchor-flashing {
                                animation: anchor-flash 0.3s ease-in-out;
                            }
                        `}</style>

                        {/* Mode Status Indicator Bar */}
                        <div style={{
                            position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)',
                            background: 'rgba(0,0,0,0.8)', borderRadius: '8px', padding: '8px 16px',
                            display: 'flex', alignItems: 'center', gap: '12px', color: '#fff', fontSize: '13px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.4)', zIndex: 200, pointerEvents: 'auto'
                        }}>
                            {posState.mode === null && (
                                <span>按住角点并拖拽至目标文本以建立锚点</span>
                            )}
                            {posState.mode === 'picking_text' && (
                                <span style={{ color: '#3b82f6' }}>📌 正在拖拽定位锚点...</span>
                            )}
                            <button
                                onClick={() => {
                                    if (posState.mode === 'picking_text') {
                                        // 取消当前拖拽
                                        setPosState(prev => ({ ...prev, mode: null, activeCorner: null }));
                                    } else if (posState.mode) {
                                        // 从选择类型模式返回
                                        setPosState(prev => ({ ...prev, mode: null, activeCorner: null }));
                                    } else {
                                        // 退出定位模式
                                        setPositioningMode(false);
                                        setPosState({ activeCorner: null, mode: null, hoverWord: null, draggingAnchor: null, savedZoom: null });
                                    }
                                }}
                                style={{
                                    background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
                                    padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'
                                }}
                            >
                                {posState.mode ? '返回' : '退出'}
                            </button>
                            {/* 保存按钮：当至少配置了2个对角锚点时可用 */}
                            {(() => {
                                const anchors = selectedRegion.positioning?.anchors || {};
                                const configuredCorners = Object.keys(anchors).filter(k => anchors[k]?.bounds);
                                const hasOppositeCorners =
                                    (configuredCorners.includes('tl') && configuredCorners.includes('br')) ||
                                    (configuredCorners.includes('tr') && configuredCorners.includes('bl'));
                                return hasOppositeCorners && (
                                    <button
                                        onClick={() => {
                                            // 保存并退出
                                            setPositioningMode(false);
                                            setPosState({ activeCorner: null, mode: null, hoverWord: null, draggingAnchor: null });
                                            // 触发历史快照
                                            if (onHistorySnapshot) onHistorySnapshot();
                                        }}
                                        style={{
                                            background: 'var(--accent-color)', border: 'none', color: '#fff',
                                            padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        ✓ 保存定位
                                    </button>
                                );
                            })()}
                        </div>

                        {/* Corner Breathing Circles */}
                        {posState.mode === null && ['tl', 'tr', 'bl', 'br'].map(corner => {

                            let cx = selectedRegion.x;
                            let cy = selectedRegion.y;
                            if (corner.includes('r')) cx += selectedRegion.width;
                            if (corner.includes('b')) cy += selectedRegion.height;

                            const isActive = false;

                            return (
                                <div key={corner} style={{ position: 'absolute', left: `${cx * 100}%`, top: `${cy * 100}%`, pointerEvents: 'none' }}>
                                    {/* Only show other circles if no corner is being configured, or show the active one */}
                                    {(posState.mode === null || isActive) && (
                                        <div
                                            className="anchor-circle"
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                // 准备开始拖拽拾取
                                                const { x, y } = getCoordinates(e);
                                                setPosState(prev => ({
                                                    ...prev,
                                                    activeCorner: corner,
                                                    mode: 'picking_text',
                                                    dragStart: { x, y },
                                                    currentDrag: { x, y }
                                                }));
                                            }}
                                            style={{
                                                position: 'absolute', left: '-12px', top: '-12px',
                                                width: '24px', height: '24px', borderRadius: '50%',
                                                background: '#fff', border: '3px solid var(--accent-color)',
                                                boxShadow: '0 0 10px rgba(139, 92, 246, 0.5)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                zIndex: isActive ? 101 : 100,
                                                cursor: 'crosshair',
                                                pointerEvents: 'auto'
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: 'var(--accent-color)',
                                                    pointerEvents: 'none'
                                                }}
                                            >
                                                <Anchor size={14} />
                                            </div>
                                        </div>
                                    )}


                                </div>
                            );
                        })}

                        {/* Dragging Preview Line */}
                        {posState.mode === 'picking_text' && posState.dragStart && posState.currentDrag && (
                            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 55 }}>
                                <line
                                    x1={`${posState.dragStart.x * 100}%`}
                                    y1={`${posState.dragStart.y * 100}%`}
                                    x2={`${posState.currentDrag.x * 100}%`}
                                    y2={`${posState.currentDrag.y * 100}%`}
                                    stroke="var(--accent-color)" strokeWidth={2} strokeDasharray="5 5"
                                />
                                <circle
                                    cx={`${posState.currentDrag.x * 100}%`}
                                    cy={`${posState.currentDrag.y * 100}%`}
                                    r={4} fill="var(--accent-color)"
                                />
                            </svg>
                        )}

                        {/* Text OCR Hover Layer */}
                        {posState.mode === 'picking_text' && !posState.confirmedAnchor && (
                            <>
                                {/* 可交互的词条层 - 红色悬停框 */}
                                {words.map((w, idx) => {
                                    const isHovered = posState.hoverWord &&
                                        posState.hoverWord.x0 === w.x0 &&
                                        posState.hoverWord.y0 === w.y0 &&
                                        posState.hoverWord.text === w.text;

                                    return (
                                        <div
                                            key={`word-${idx}`}
                                            // onMouseEnter/Leave handled by handleMouseMove for drag consistency
                                            style={{
                                                position: 'absolute',
                                                left: `${w.x0 * 100}%`,
                                                top: `${w.y0 * 100}%`,
                                                width: `${(w.x1 - w.x0) * 100}%`,
                                                height: `${(w.y1 - w.y0) * 100}%`,
                                                pointerEvents: 'none', // During drag, transparency to mouse events is better? No, MouseMove handles it.
                                                background: isHovered ? 'rgba(59, 130, 246, 0.2)' : 'rgba(0, 0, 0, 0.02)',
                                                border: isHovered ? '2px solid var(--accent-color)' : '1px solid rgba(59, 130, 246, 0.1)',
                                                borderRadius: '2px',
                                                zIndex: 60,
                                            }}
                                        />
                                    );
                                })}
                            </>
                        )}

                        {/* 捕获反馈闪烁框 */}
                        {posState.flashingWord && posState.flashCount % 2 === 0 && (
                            <div
                                style={{
                                    position: 'absolute',
                                    left: `${posState.flashingWord.x0 * 100}%`,
                                    top: `${posState.flashingWord.y0 * 100}%`,
                                    width: `${(posState.flashingWord.x1 - posState.flashingWord.x0) * 100}%`,
                                    height: `${(posState.flashingWord.y1 - posState.flashingWord.y0) * 100}%`,
                                    border: '3px solid var(--accent-color)',
                                    background: 'rgba(59, 130, 246, 0.3)',
                                    borderRadius: '4px',
                                    boxShadow: '0 0 15px var(--accent-color)',
                                    zIndex: 1000,
                                    pointerEvents: 'none'
                                }}
                            />
                        )}

                        {/* 确认的文本锚点：闪烁动画 + 蓝色虚线框 + 可移动外框 */}
                        {posState.confirmedAnchor && (
                            <ConfirmedTextAnchor
                                corner={posState.activeCorner}
                                word={posState.confirmedAnchor.word}
                                cornerHandle={posState.confirmedAnchor.cornerHandle}
                                flashCount={posState.flashCount}
                                onFlashEnd={() => setPosState(prev => ({ ...prev, flashCount: 0 }))}
                                onHandleMove={(newPos) => {
                                    setPosState(prev => ({
                                        ...prev,
                                        confirmedAnchor: {
                                            ...prev.confirmedAnchor,
                                            cornerHandle: newPos
                                        }
                                    }));

                                    // 实时更新区块几何形状（预览效果）
                                    const corner = posState.activeCorner;
                                    setRegions(prev => prev.map(r => {
                                        if (r.id !== selectedRegion.id) return r;
                                        let { x: rx, y: ry, width: rw, height: rh } = r;
                                        const rb = ry + rh;
                                        const rr = rx + rw;
                                        // 确保宽度和高度不为负
                                        if (corner === 'tl') { rx = newPos.x; ry = newPos.y; rw = Math.max(0.001, rr - rx); rh = Math.max(0.001, rb - ry); }
                                        else if (corner === 'tr') { ry = newPos.y; rw = Math.max(0.001, newPos.x - rx); rh = Math.max(0.001, rb - ry); }
                                        else if (corner === 'bl') { rx = newPos.x; rw = Math.max(0.001, rr - rx); rh = Math.max(0.001, newPos.y - ry); }
                                        else if (corner === 'br') { rw = Math.max(0.001, newPos.x - rx); rh = Math.max(0.001, newPos.y - ry); }
                                        return { ...r, x: rx, y: ry, width: rw, height: rh };
                                    }));
                                }}
                                onConfirm={() => {
                                    // 保存锚点数据
                                    const w = posState.confirmedAnchor.word;
                                    const handle = posState.confirmedAnchor.cornerHandle;
                                    const corner = posState.activeCorner;
                                    const ax = (w.x0 + w.x1) / 2;
                                    const ay = (w.y0 + w.y1) / 2;

                                    const nextRegions = regions.map(r => {
                                        if (r.id !== selectedRegion.id) return r;
                                        const positioning = { ...(r.positioning || {}) };
                                        const anchors = { ...(positioning.anchors || {}) };
                                        anchors[corner] = {
                                            type: 'text',
                                            text: w.text,
                                            bounds: [w.x0, w.y0, w.x1, w.y1],
                                            offset_x: handle.x - ax,
                                            offset_y: handle.y - ay
                                        };
                                        return { ...r, positioning: { ...positioning, anchors } };
                                    });
                                    setRegions(nextRegions);
                                    exitCaptureMode();
                                    if (onHistorySnapshot) onHistorySnapshot(nextRegions);
                                }}
                                getCoordinates={getCoordinates}
                                containerRef={containerRef}
                            />
                        )}


                    </div>
                )}

                {/* Drawn Anchors Visualization Layer (Visible when positioningMode is on) */}
                {positioningMode && selectedRegion && (
                    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 60 }}>
                        {Object.entries(selectedRegion.positioning?.anchors || {}).map(([corner, anchor]) => {
                            if (!anchor.bounds) return null;
                            const [ax0, ay0, ax1, ay1] = anchor.bounds;
                            const ax = (ax0 + ax1) / 2;
                            const ay = (ay0 + ay1) / 2;

                            // Corner position = anchor_center + offset
                            const cx = ax + anchor.offset_x;
                            const cy = ay + anchor.offset_y;

                            // 删除锚点处理函数
                            const handleDeleteAnchor = (e) => {
                                e.stopPropagation();
                                const nextAnchors = { ...(selectedRegion.positioning?.anchors || {}) };
                                delete nextAnchors[corner];
                                const nextRegions = regions.map(r => r.id === selectedRegion.id ? {
                                    ...r,
                                    positioning: {
                                        ...r.positioning,
                                        anchors: nextAnchors
                                    }
                                } : r);
                                setRegions(nextRegions);
                                if (onHistorySnapshot) onHistorySnapshot(nextRegions);
                            };

                            return (
                                <g key={corner}>
                                    {/* Anchor Bounds Visual */}
                                    <rect
                                        x={`${ax0 * 100}%`} y={`${ay0 * 100}%`}
                                        width={`${(ax1 - ax0) * 100}%`} height={`${(ay1 - ay0) * 100}%`}
                                        fill="rgba(59, 130, 246, 0.1)" stroke="#3b82f6"
                                        strokeWidth={2} strokeDasharray="5 5"
                                    />

                                    {/* Delete Button at top-right of anchor bounds */}
                                    <foreignObject
                                        x={`calc(${ax1 * 100}% - 10px)`}
                                        y={`calc(${ay0 * 100}% - 10px)`}
                                        width="20" height="20"
                                        style={{ overflow: 'visible' }}
                                    >
                                        <div
                                            onClick={handleDeleteAnchor}
                                            style={{
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '50%',
                                                background: '#ef4444',
                                                color: 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                pointerEvents: 'auto',
                                                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                                                transition: 'transform 0.15s, background 0.15s'
                                            }}
                                            onMouseEnter={(e) => { e.target.style.transform = 'scale(1.15)'; e.target.style.background = '#dc2626'; }}
                                            onMouseLeave={(e) => { e.target.style.transform = 'scale(1)'; e.target.style.background = '#ef4444'; }}
                                        >
                                            <X size={12} />
                                        </div>
                                    </foreignObject>

                                    {/* Connection Line */}
                                    <line
                                        x1={`${ax * 100}%`} y1={`${ay * 100}%`}
                                        x2={`${cx * 100}%`} y2={`${cy * 100}%`}
                                        stroke="var(--accent-color)" strokeWidth={1.5} strokeDasharray="4 4"
                                    />

                                    {/* Corner Dot (Draggable to re-pick) */}
                                    <g
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            const { x, y } = getCoordinates(e);
                                            setPosState(prev => ({
                                                ...prev,
                                                activeCorner: corner,
                                                mode: 'picking_text',
                                                dragStart: { x, y },
                                                currentDrag: { x, y }
                                            }));
                                        }}
                                        style={{ pointerEvents: 'auto', cursor: 'crosshair' }}
                                    >
                                        <circle cx={`${cx * 100}%`} cy={`${cy * 100}%`} r={8} fill="white" stroke="var(--accent-color)" strokeWidth={2} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
                                        <foreignObject
                                            x={`calc(${cx * 100}% - 8px)`}
                                            y={`calc(${cy * 100}% - 8px)`}
                                            width="16" height="16"
                                        >
                                            <div style={{ color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Anchor size={10} />
                                            </div>
                                        </foreignObject>
                                    </g>

                                    {/* Anchor Point on Text (Small circle) */}
                                    <circle cx={`${ax * 100}%`} cy={`${ay * 100}%`} r={4} fill="var(--accent-color)" />
                                </g>
                            );
                        })}
                    </svg>
                )}
            </div>
        </div >
    );
};

export default DocumentEditor;
export { TYPE_CONFIG };
