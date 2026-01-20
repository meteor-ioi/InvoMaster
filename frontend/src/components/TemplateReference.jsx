import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Upload, FileText, Play, Clock, CheckCircle, AlertCircle, Copy, Download, Layout, FileJson, FileCode, Check, Search, ChevronDown, ChevronUp, Sparkles, User, ChevronLeft, ChevronRight, Trash2, Package, RefreshCw, FileSpreadsheet, Settings } from 'lucide-react';
import { API_BASE } from '../config';

export default function TemplateReference({ device, headerCollapsed = false }) {
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState('auto');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState([]);
    const [outputFormat, setOutputFormat] = useState('json'); // 'json', 'markdown', 'csv', 'xml'
    const [copied, setCopied] = useState(false);
    const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(null);
    const [selectedHistory, setSelectedHistory] = useState(new Set()); // Set of history indices

    // --- Tab & Search States ---
    const [activeTab, setActiveTab] = useState('config'); // 'config' or 'history'
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
    const [isHoveringToggle, setIsHoveringToggle] = useState(false);
    const dropdownRef = useRef(null);

    // --- Table Column Resize States ---
    const [fieldDefWidth, setFieldDefWidth] = useState(140);
    const [isResizing, setIsResizing] = useState(false);
    const resizeRef = useRef(null);

    // --- Batch Processing States ---
    const [files, setFiles] = useState([]);                    // File[] - 待处理文件列表
    const [batchResults, setBatchResults] = useState(new Map()); // Map<filename, result>
    const [processingIndex, setProcessingIndex] = useState(-1);  // 当前处理的文件索引 (-1 表示未在处理)
    const [isBatchMode, setIsBatchMode] = useState(false);       // 是否处于批处理模式
    const [isDragging, setIsDragging] = useState(false);         // 拖拽状态

    useEffect(() => {
        fetchTemplates();
        fetchHistory();

        const handleToggleSidebars = (e) => {
            setIsPanelCollapsed(e.detail.collapsed);
        };

        window.addEventListener('toggle-sidebars', handleToggleSidebars);

        // Handle column resize
        const handleMouseMove = (e) => {
            if (isResizing && resizeRef.current) {
                const containerLeft = resizeRef.current.getBoundingClientRect().left;
                const newWidth = e.clientX - containerLeft;
                if (newWidth >= 100 && newWidth <= 400) {
                    setFieldDefWidth(newWidth);
                }
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        // Handle click outside to close dropdown
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('toggle-sidebars', handleToggleSidebars);
        };
    }, [isResizing]);

    const fetchTemplates = async () => {
        try {
            const res = await axios.get(`${API_BASE}/templates`);
            setTemplates(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await axios.get(`${API_BASE}/history`);
            setHistory(res.data);
        } catch (err) {
            console.error("Failed to fetch history", err);
        }
    };

    const handleDeleteHistory = async (index, e) => {
        if (e) e.stopPropagation();
        // This is now only used internally or if we still wanted single delete via some menu
        if (!confirm('确定要删除这条历史记录吗?')) return;

        try {
            await axios.delete(`${API_BASE}/history/${index}`);
            if (selectedHistoryIndex === index) {
                setResult(null);
                setSelectedHistoryIndex(null);
            }
            // Clear from selection if present
            const newSelected = new Set(selectedHistory);
            newSelected.delete(index);
            setSelectedHistory(newSelected);

            fetchHistory();
        } catch (err) {
            console.error("Failed to delete history", err);
            alert("删除失败: " + (err.response?.data?.detail || err.message));
        }
    };

    const handleBatchDeleteHistory = async () => {
        if (selectedHistory.size === 0) return;
        if (!confirm(`确定要批量删除这 ${selectedHistory.size} 条历史记录吗?`)) return;

        try {
            setLoading(true);
            await axios.post(`${API_BASE}/history/batch-delete`, {
                indices: Array.from(selectedHistory)
            });

            // If currently viewed item is deleted, clear it
            if (selectedHistory.has(selectedHistoryIndex)) {
                setResult(null);
                setSelectedHistoryIndex(null);
            }

            setSelectedHistory(new Set());
            fetchHistory();
        } catch (err) {
            console.error("Failed to batch delete history", err);
            alert("批量删除失败: " + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    };

    const toggleHistorySelection = (index, e) => {
        e.stopPropagation();
        const newSelected = new Set(selectedHistory);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedHistory(newSelected);
    };

    const toggleSelectAllHistory = () => {
        if (selectedHistory.size === history.length && history.length > 0) {
            setSelectedHistory(new Set());
        } else {
            setSelectedHistory(new Set(history.map(h => h.index)));
        }
    };

    const handleViewHistory = async (index) => {
        try {
            const res = await axios.get(`${API_BASE}/history/${index}`);
            const historyItem = res.data;

            // Transform history data to match the result format
            setResult({
                status: 'success',
                filename: historyItem.filename,
                template_name: historyItem.template_name,
                mode: historyItem.mode || 'custom_forced',
                data: historyItem.result_summary,
                timestamp: historyItem.timestamp
            });
            setSelectedHistoryIndex(index);
        } catch (err) {
            console.error("Failed to load history item", err);
            alert("加载历史记录失败: " + (err.response?.data?.detail || err.message));
        }
    };

    const handleFileUpload = (e) => {
        const selectedFiles = Array.from(e.target.files);
        processSelectedFiles(selectedFiles);
    };

    // 统一处理文件选择逻辑（用于点击上传和拖拽上传）
    const processSelectedFiles = (selectedFiles) => {
        if (selectedFiles.length === 0) return;

        // 过滤只保留 PDF 文件
        const pdfFiles = selectedFiles.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
        if (pdfFiles.length === 0) {
            alert('请选择 PDF 文件');
            return;
        }

        // 将新文件追加到待处理任务列表
        setFiles(prev => [...prev, ...pdfFiles]);

        // 如果当前没有选中的文件，则默认选中第一个
        if (!file && pdfFiles.length > 0 && files.length === 0) {
            setFile(pdfFiles[0]);
            setIsBatchMode(pdfFiles.length > 1);
        } else if (files.length > 0 || pdfFiles.length > 1) {
            setIsBatchMode(true);
        }

        setResult(null);
        setSelectedHistoryIndex(null);
    };

    const handleDeleteQueueItem = (index, e) => {
        e.stopPropagation();
        const removedFile = files[index];
        const newFiles = files.filter((_, i) => i !== index);
        setFiles(newFiles);

        // 如果删除的是当前选中的文件
        if (file && file.name === removedFile.name) {
            setFile(newFiles.length > 0 ? newFiles[0] : null);
        }

        if (newFiles.length <= 1) {
            setIsBatchMode(false);
        }
    };

    // 拖拽事件处理
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // 只有当离开整个拖拽区域时才取消拖拽状态
        if (e.currentTarget.contains(e.relatedTarget)) return;
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        processSelectedFiles(droppedFiles);
    };

    const handleExecute = async () => {
        if (!file) return alert("请先上传文件");
        setLoading(true);
        setResult(null);
        setSelectedHistoryIndex(null); // Clear history selection when executing new extraction
        try {
            const formData = new FormData();
            formData.append('file', file);

            let resultObj;
            if (selectedTemplate === 'auto') {
                const res = await axios.post(`${API_BASE}/analyze`, formData, {
                    params: { device }
                });

                const dataMap = buildDataMap(res.data);

                // MODIFIED: Prioritize backend message for no-match scenario
                let templateName;
                if (res.data.message === "未匹配到模板") {
                    templateName = "未匹配到模板";
                } else if (res.data.template_found && res.data.matched_template) {
                    templateName = res.data.matched_template.name;
                } else {
                    templateName = res.data.template_found ? '自动匹配' : '未匹配到模板';
                }

                resultObj = {
                    status: 'success',
                    filename: res.data.filename,
                    template_name: templateName,
                    mode: 'auto',
                    data: dataMap,
                    raw_regions: res.data.regions,
                    timestamp: new Date().toISOString()
                };
                setResult(resultObj);
            } else {
                const res = await axios.post(`${API_BASE}/extract`, formData, {
                    params: { template_id: selectedTemplate }
                });
                resultObj = res.data;
                setResult(resultObj);
            }
            // 提取成功后刷新历史记录
            fetchHistory();

            // 处理完成后从待处理列表中移除该文件
            setFiles(prev => prev.filter(f => f.name !== file.name));
            setFile(null); // Clear selected file after processing
            setIsBatchMode(false); // Reset to single mode if no files left or one file left
        } catch (err) {
            console.error(err);
            alert("执行失败: " + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    };

    // 辅助函数：从分析结果构建数据映射
    const buildDataMap = (resData) => {
        const dataMap = {};
        (resData.regions || []).forEach(r => {
            const key = r.id;
            dataMap[key] = {
                type: r.type,
                label: r.label || r.id,
                remarks: r.remarks || '',
                content: r.content || r.text || '',
                x: r.x,
                y: r.y
            };
        });
        return dataMap;
    };

    // 批量执行处理
    const handleBatchExecute = async () => {
        if (files.length === 0) return;

        setLoading(true);
        setResult(null);
        setSelectedHistoryIndex(null);
        setBatchResults(new Map());

        const newResults = new Map();

        for (let i = 0; i < files.length; i++) {
            setProcessingIndex(i);

            try {
                const formData = new FormData();
                formData.append('file', files[i]);

                let resultObj;
                if (selectedTemplate === 'auto') {
                    const res = await axios.post(`${API_BASE}/analyze`, formData, {
                        params: { device }
                    });

                    const dataMap = buildDataMap(res.data);

                    // MODIFIED: Prioritize backend message for no-match scenario
                    let templateName;
                    if (res.data.message === "未匹配到模板") {
                        templateName = "未匹配到模板";
                    } else if (res.data.template_found && res.data.matched_template) {
                        templateName = res.data.matched_template.name;
                    } else {
                        templateName = res.data.template_found ? '自动匹配' : '未匹配到模板';
                    }

                    resultObj = {
                        status: 'success',
                        filename: res.data.filename,
                        template_name: templateName,
                        mode: 'auto',
                        data: dataMap,
                        raw_regions: res.data.regions,
                        timestamp: new Date().toISOString()
                    };
                } else {
                    const res = await axios.post(`${API_BASE}/extract`, formData, {
                        params: { template_id: selectedTemplate }
                    });
                    resultObj = res.data;
                }

                newResults.set(files[i].name, resultObj);
                setBatchResults(new Map(newResults));

                // 处理完每个文件后立即刷新历史记录，实现自动同步
                fetchHistory();

                // 自动显示第一个完成的结果
                if (i === 0) {
                    setResult(resultObj);
                }
            } catch (err) {
                console.error(`处理文件 ${files[i].name} 失败:`, err);
                const errorResult = {
                    status: 'error',
                    filename: files[i].name,
                    template_name: '处理失败',
                    error: err.response?.data?.detail || err.message,
                    data: {},
                    timestamp: new Date().toISOString()
                };
                newResults.set(files[i].name, errorResult);
            }
        }

        // 批量处理完成后，移除所有已处理的文件名对应的列表项
        const finishedNames = Array.from(newResults.keys());
        setFiles(prev => prev.filter(f => !finishedNames.includes(f.name)));

        setProcessingIndex(-1);
        setLoading(false);
    };

    // 按页面位置排序(从左上到右下):优先按 y 坐标,同一水平线上按 x 坐标
    const getSortedEntries = (data) => {
        const entries = Object.entries(data);
        return entries.sort(([, a], [, b]) => {
            // 优先按 y 坐标(从上到下)
            const yDiff = (a.y || 0) - (b.y || 0);
            if (Math.abs(yDiff) > 0.01) return yDiff;
            // 同一水平线上,按 x 坐标(从左到右)
            return (a.x || 0) - (b.x || 0);
        });
    };

    // --- Data Conversion Logic ---
    const getMarkdown = () => {
        if (!result) return "";
        let md = `# 提取结果报告: ${result.filename}\n`;
        md += `> 匹配模板: ${result.template_name} | 提取时间: ${new Date(result.timestamp || new Date()).toLocaleString()}\n\n`;
        md += "---\n\n";

        getSortedEntries(result.data).forEach(([regionId, item]) => {
            const { type, label, remarks, content } = item;

            // 区域标题与类型
            md += `### ${label || regionId} \`[${type}]\`\n\n`;

            if (remarks) {
                md += `**备注**: ${remarks}\n\n`;
            }

            // 根据类型渲染内容
            if (type === 'table' && Array.isArray(content)) {
                if (content.length > 0) {
                    const sanitize = (cell) => String(cell || '').replace(/\n/g, '<br>').replace(/\|/g, '\\|');

                    md += `| ${content[0].map(sanitize).join(' | ')} |\n`;
                    md += `| ${content[0].map(() => '---').join(' | ')} |\n`;
                    content.slice(1).forEach(row => {
                        md += `| ${row.map(sanitize).join(' | ')} |\n`;
                    });
                }
            } else {
                md += `${content}\n`;
            }

            md += "\n---\n\n";
        });

        md += `\n*Generated by Industry PDF Analyzer*`;
        return md;
    };

    const getJson = () => {
        if (!result) return {};
        return result.data;
    };

    const getXml = () => {
        if (!result) return "";
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<extraction_result>\n`;
        xml += `  <metadata>\n    <filename>${result.filename}</filename>\n    <template>${result.template_name}</template>\n    <mode>${result.mode}</mode>\n  </metadata>\n`;
        xml += `  <regions>\n`;

        getSortedEntries(result.data).forEach(([regionId, item]) => {
            xml += `    <region id="${regionId}">\n`;
            xml += `      <type>${item.type}</type>\n`;
            xml += `      <label>${item.label || ''}</label>\n`;
            if (item.remarks) {
                xml += `      <remarks><![CDATA[${item.remarks}]]></remarks>\n`;
            }

            if (Array.isArray(item.content)) {
                xml += `      <content type="table">\n`;
                item.content.forEach((row, idx) => {
                    xml += `        <row index="${idx}">\n`;
                    row.forEach((cell, cellIdx) => {
                        xml += `          <cell index="${cellIdx}"><![CDATA[${cell}]]></cell>\n`;
                    });
                    xml += `        </row>\n`;
                });
                xml += `      </content>\n`;
            } else {
                xml += `      <content type="text"><![CDATA[${item.content}]]></content>\n`;
            }

            xml += `    </region>\n`;
        });

        xml += `  </regions>\n</extraction_result>`;
        return xml;
    };

    const getCsv = () => {
        if (!result) return "";
        let csv = "\uFEFF"; // BOM to force Excel to read as UTF-8
        csv += `文件名称,${result.filename}\n`;
        csv += `匹配模板,${result.template_name}\n`;
        csv += `识别模式,${result.mode}\n\n`;

        getSortedEntries(result.data).forEach(([regionId, item]) => {
            csv += `>>> 区域: ${item.label || regionId} [${item.type}]\n`;
            if (item.remarks) {
                // Handle commas/quotes in remarks
                let r = String(item.remarks).replace(/"/g, '""');
                if (r.search(/("|,|\n)/g) >= 0) r = `"${r}"`;
                csv += `备注,${r}\n`;
            }

            if (Array.isArray(item.content)) {
                // Table content
                if (item.content.length > 0) {
                    item.content.forEach(row => {
                        const escapedRow = row.map(cell => {
                            if (cell === null || cell === undefined) return '';
                            let s = String(cell).replace(/"/g, '""');
                            if (s.search(/("|,|\n)/g) >= 0) s = `"${s}"`;
                            return s;
                        });
                        csv += escapedRow.join(',') + '\n';
                    });
                }
            } else {
                // Text content
                let s = String(item.content || '').replace(/"/g, '""');
                if (s.search(/("|,|\n)/g) >= 0) s = `"${s}"`;
                csv += `内容,${s}\n`;
            }
            csv += '\n'; // Empty line between regions
        });
        return csv;
    };

    // --- 数据预览渲染辅助函数 ---

    // JSON 语法高亮渲染
    const renderJsonWithHighlight = (data) => {
        const jsonString = JSON.stringify(data, null, 2);

        // 简单的语法高亮实现
        const highlighted = jsonString
            .replace(/("(?:\\.|[^"\\])*")\s*:/g, '<span style="color: #60a5fa;">$1</span>:') // 键名 - 蓝色
            .replace(/:\s*("(?:\\.|[^"\\])*")/g, ': <span style="color: #34d399;">$1</span>') // 字符串值 - 绿色
            .replace(/:\s*(-?\d+\.?\d*)/g, ': <span style="color: #fbbf24;">$1</span>') // 数值 - 橙色
            .replace(/:\s*(true|false|null)/g, ': <span style="color: #a78bfa;">$1</span>'); // 布尔/null - 紫色

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(data).map(([key, item]) => (
                    <div
                        key={key}
                        style={{
                            background: 'var(--input-bg)',
                            borderRadius: '10px',
                            border: '1px solid var(--glass-border)',
                            padding: '12px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: item.type === 'table' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                color: item.type === 'table' ? 'var(--accent-color)' : 'var(--primary-color)',
                                fontWeight: 'bold'
                            }}>
                                {item.type}
                            </span>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                {item.label || key}
                            </span>
                        </div>
                        <div style={{
                            fontSize: '13px',
                            color: 'var(--text-primary)',
                            background: 'rgba(255,255,255,0.02)',
                            padding: '12px',
                            borderRadius: '8px',
                            lineHeight: '1.6',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            {item.type === 'table' && Array.isArray(item.content) ? (
                                <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.1)' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--glass-border)' }}>
                                                {item.content[0]?.map((cell, cIdx) => (
                                                    <th key={cIdx} style={{
                                                        padding: '10px 15px',
                                                        color: 'var(--primary-color)',
                                                        fontWeight: 'bold',
                                                        borderRight: cIdx === item.content[0].length - 1 ? 'none' : '1px solid var(--glass-border)'
                                                    }}>{cell}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {item.content.slice(1).map((row, rowIndex) => (
                                                <tr key={rowIndex} style={{ borderBottom: rowIndex === item.content.length - 2 ? 'none' : '1px solid var(--glass-border)', background: rowIndex % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                                                    {row.map((cell, cIdx) => (
                                                        <td key={cIdx} style={{
                                                            padding: '10px 15px',
                                                            color: 'var(--text-primary)',
                                                            borderRight: cIdx === row.length - 1 ? 'none' : '1px solid var(--glass-border)'
                                                        }}>{cell}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div style={{ whiteSpace: 'pre-wrap' }}>{String(item.content)}</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // XML 语法高亮渲染
    const renderXmlWithHighlight = () => {
        const xmlString = getXml();

        // XML 语法高亮
        const highlighted = xmlString
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/(&lt;\/?)([\w-]+)/g, '$1<span style="color: #60a5fa; font-weight: bold;">$2</span>') // 标签名 - 蓝色
            .replace(/([\w-]+)=("(?:\\.|[^"\\])*")/g, '<span style="color: #22d3ee;">$1</span>=<span style="color: #34d399;">$2</span>') // 属性 - 青色和绿色
            .replace(/(&lt;!\[CDATA\[)([\s\S]*?)(\]\]&gt;)/g, '$1<span style="color: #34d399;">$2</span>$3'); // CDATA - 绿色

        return (
            <pre className="custom-scrollbar" style={{
                background: 'rgba(15, 23, 42, 0.9)',
                padding: '24px',
                borderRadius: '16px',
                overflow: 'auto',
                fontSize: '13px',
                lineHeight: '1.8',
                border: '1px solid var(--glass-border)',
                animation: 'slideUp 0.3s ease',
                maxHeight: '600px',
                color: '#cbd5e1',
                fontFamily: 'monospace'
            }} dangerouslySetInnerHTML={{ __html: highlighted }} />
        );
    };



    const handleCopy = () => {
        let text = "";
        if (outputFormat === 'markdown') text = getMarkdown();
        else if (outputFormat === 'json') text = JSON.stringify(getJson(), null, 2);
        else if (outputFormat === 'xml') text = getXml();
        else if (outputFormat === 'csv') text = getCsv();

        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        let content = "";
        let ext = "";
        let type = "text/plain";

        if (outputFormat === 'markdown') { content = getMarkdown(); ext = "md"; }
        else if (outputFormat === 'json') { content = JSON.stringify(getJson(), null, 2); ext = "json"; type = "application/json"; }
        else if (outputFormat === 'xml') { content = getXml(); ext = "xml"; type = "application/xml"; }
        else if (outputFormat === 'csv') { content = getCsv(); ext = "csv"; type = "text/csv;charset=utf-8;"; }

        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `extraction_${new Date().getTime()}.${ext}`;
        a.click();
    };

    // --- Filtered Templates Logic ---
    const filteredTemplates = templates.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.id && t.id.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesSearch;
    });

    const getSelectedName = () => {
        if (selectedTemplate === 'auto') return "自动识别匹配";
        const found = templates.find(t => t.id === selectedTemplate);
        return found ? found.name : "未知模板";
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 20px 40px' }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: isPanelCollapsed ? '64px 1fr' : '300px 1fr',
                gap: '20px',
                alignItems: 'start',
                transition: 'grid-template-columns 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative'
            }}>

                {/* Control Panel */}
                <aside style={{
                    position: 'sticky',
                    top: '20px',
                    width: isPanelCollapsed ? '64px' : '300px',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '15px',
                    height: headerCollapsed ? 'calc(100vh - 76px)' : 'calc(100vh - 100px)',
                    overflow: 'visible'
                }}>
                    {/* 悬浮切换按钮 */}
                    <div
                        style={{
                            position: 'absolute',
                            right: '-20px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 100,
                            cursor: 'pointer',
                            opacity: isHoveringToggle ? 0.5 : 0.1,
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={() => setIsHoveringToggle(true)}
                        onMouseLeave={() => setIsHoveringToggle(false)}
                        onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
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
                            {isPanelCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                        </div>
                    </div>

                    {isPanelCollapsed ? (
                        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '20px 0', borderRadius: '16px' }}>
                            <div style={{
                                width: '44px',
                                height: '44px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: activeTab === 'config' ? 'var(--primary-color)' : 'var(--accent-color)'
                            }}>
                                {activeTab === 'config' ? <Settings size={20} /> : <Clock size={20} />}
                            </div>

                            <button
                                onClick={() => document.getElementById('ref-upload-collapsed').click()}
                                style={{ width: '44px', height: '44px', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--primary-color)', transition: 'all 0.2s' }}
                                title="上传 PDF（支持多选）"
                            >
                                <Upload size={22} />
                                <input id="ref-upload-collapsed" type="file" multiple className="hidden" accept=".pdf,application/pdf" onChange={handleFileUpload} />
                            </button>

                            <button
                                onClick={isBatchMode ? handleBatchExecute : handleExecute}
                                disabled={(!file && files.length === 0) || loading}
                                style={{ width: '44px', height: '44px', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--success-color)', transition: 'all 0.2s', opacity: ((!file && files.length === 0) || loading) ? 0.5 : 1 }}
                                title={isBatchMode ? `批量提取 ${files.length} 个文件` : '开始提取'}
                            >
                                {loading ? <RefreshCw size={22} className="animate-spin" /> : <Play size={22} />}
                            </button>

                            <button
                                onClick={() => setIsPanelCollapsed(false)}
                                style={{ width: '44px', height: '44px', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.2s' }}
                                title="展开面板"
                            >
                                <ChevronRight size={22} />
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Single Card with Tabs */}
                            <div className="glass-card" style={{
                                flex: 1,
                                padding: '0',
                                borderRadius: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                height: '100%'
                            }}>
                                {/* Tab Bar */}
                                <div style={{
                                    display: 'flex',
                                    borderBottom: '1px solid var(--glass-border)',
                                    background: 'rgba(255,255,255,0.02)'
                                }}>
                                    <button
                                        onClick={() => setActiveTab('config')}
                                        style={{
                                            flex: 1,
                                            padding: '12px 15px',
                                            border: 'none',
                                            background: 'transparent',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            fontSize: '13px',
                                            fontWeight: activeTab === 'config' ? 'bold' : 'normal',
                                            color: activeTab === 'config' ? 'var(--primary-color)' : 'var(--text-secondary)',
                                            borderBottom: activeTab === 'config' ? '2px solid var(--primary-color)' : '2px solid transparent',
                                            transition: 'all 0.3s ease',
                                            position: 'relative'
                                        }}
                                        className="tab-button"
                                    >
                                        <Settings size={14} />
                                        识别配置
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('history')}
                                        style={{
                                            flex: 1,
                                            padding: '12px 15px',
                                            border: 'none',
                                            background: 'transparent',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            fontSize: '13px',
                                            fontWeight: activeTab === 'history' ? 'bold' : 'normal',
                                            color: activeTab === 'history' ? 'var(--accent-color)' : 'var(--text-secondary)',
                                            borderBottom: activeTab === 'history' ? '2px solid var(--accent-color)' : '2px solid transparent',
                                            transition: 'all 0.3s ease',
                                            position: 'relative'
                                        }}
                                        className="tab-button"
                                    >
                                        <Clock size={14} />
                                        提取记录
                                        {history.length > 0 && (
                                            <span style={{
                                                fontSize: '10px',
                                                padding: '1px 5px',
                                                borderRadius: '10px',
                                                background: 'var(--accent-color)',
                                                color: 'white',
                                                fontWeight: 'bold',
                                                minWidth: '18px',
                                                textAlign: 'center'
                                            }}>
                                                {history.length}
                                            </span>
                                        )}
                                    </button>
                                </div>

                                {/* Tab Content */}
                                <div style={{
                                    flex: 1,
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}>
                                    {/* Config Tab */}
                                    {activeTab === 'config' && (
                                        <div style={{
                                            flex: 1,
                                            padding: '15px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '15px',
                                            animation: 'fadeIn 0.3s ease',
                                            overflow: 'hidden'
                                        }}>
                                            {/* 模板选择器 */}
                                            <div style={{ position: 'relative' }} ref={dropdownRef}>
                                                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                                                    选择模板
                                                </label>
                                                <div
                                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px',
                                                        borderRadius: '10px',
                                                        background: 'var(--input-bg)',
                                                        border: `1px solid ${isDropdownOpen ? 'var(--primary-color)' : 'var(--glass-border)'}`,
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        cursor: 'pointer',
                                                        boxShadow: isDropdownOpen ? '0 0 0 2px rgba(59, 130, 246, 0.1)' : 'none',
                                                        transition: 'all 0.2s ease',
                                                        minHeight: '40px'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                                        {selectedTemplate === 'auto' ? <Sparkles size={14} color="var(--primary-color)" /> : <Layout size={14} color="var(--accent-color)" />}
                                                        <span style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {getSelectedName()}
                                                        </span>
                                                    </div>
                                                    <ChevronDown size={14} color="var(--text-secondary)" />
                                                </div>

                                                {isDropdownOpen && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '100%',
                                                        left: 0,
                                                        right: 0,
                                                        marginTop: '6px',
                                                        background: 'var(--glass-bg)',
                                                        backdropFilter: 'blur(20px)',
                                                        border: '1px solid var(--glass-border)',
                                                        borderRadius: '12px',
                                                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                                        zIndex: 50,
                                                        overflow: 'hidden',
                                                        animation: 'slideUp 0.2s ease'
                                                    }}>
                                                        <div style={{ padding: '8px', borderBottom: '1px solid var(--glass-border)' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--input-bg)', padding: '6px 10px', borderRadius: '8px' }}>
                                                                <Search size={12} color="var(--text-secondary)" />
                                                                <input
                                                                    type="text"
                                                                    placeholder="搜索模板 ID 或名称..."
                                                                    value={searchQuery}
                                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    style={{
                                                                        border: 'none',
                                                                        background: 'transparent',
                                                                        outline: 'none',
                                                                        fontSize: '12px',
                                                                        color: 'var(--text-primary)',
                                                                        width: '100%'
                                                                    }}
                                                                    autoFocus
                                                                />
                                                            </div>
                                                        </div>
                                                        <div style={{ maxHeight: '250px', overflowY: 'auto' }} className="custom-scrollbar">
                                                            <div
                                                                onClick={() => { setSelectedTemplate('auto'); setIsDropdownOpen(false); }}
                                                                className="list-item-hover"
                                                                style={{
                                                                    padding: '10px 12px',
                                                                    fontSize: '12px',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '8px',
                                                                    background: selectedTemplate === 'auto' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                                                    color: selectedTemplate === 'auto' ? 'var(--primary-color)' : 'var(--text-primary)',
                                                                    borderBottom: '1px solid var(--glass-border)'
                                                                }}
                                                            >
                                                                {selectedTemplate === 'auto' && <Check size={12} />}
                                                                <Sparkles size={12} />
                                                                自动识别匹配
                                                            </div>

                                                            {filteredTemplates.length === 0 ? (
                                                                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                                                                    无匹配模板
                                                                </div>
                                                            ) : (
                                                                filteredTemplates.map(t => (
                                                                    <div
                                                                        key={t.id}
                                                                        onClick={() => { setSelectedTemplate(t.id); setIsDropdownOpen(false); }}
                                                                        className="list-item-hover"
                                                                        style={{
                                                                            padding: '10px 12px',
                                                                            fontSize: '12px',
                                                                            cursor: 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '8px',
                                                                            background: selectedTemplate === t.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                                                            color: selectedTemplate === t.id ? 'var(--primary-color)' : 'var(--text-primary)',
                                                                            borderBottom: filteredTemplates[filteredTemplates.length - 1].id === t.id ? 'none' : '1px solid rgba(255,255,255,0.05)'
                                                                        }}
                                                                    >
                                                                        {selectedTemplate === t.id && <Check size={12} />}
                                                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                                                            <div style={{ fontWeight: '500' }}>{t.name}</div>
                                                                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>{t.id}</div>
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* File Upload */}
                                            <div>
                                                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                                                    上传文件
                                                </label>
                                                <div
                                                    style={{
                                                        border: isDragging ? '2px dashed var(--primary-color)' : '1px dashed var(--glass-border)',
                                                        borderRadius: '12px',
                                                        padding: '24px 15px',
                                                        textAlign: 'center',
                                                        cursor: 'pointer',
                                                        background: isDragging ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.02)',
                                                        transition: 'all 0.2s ease',
                                                        transform: isDragging ? 'scale(1.02)' : 'scale(1)'
                                                    }}
                                                    onClick={() => document.getElementById('ref-upload-side').click()}
                                                    onDragOver={handleDragOver}
                                                    onDragEnter={handleDragEnter}
                                                    onDragLeave={handleDragLeave}
                                                    onDrop={handleDrop}
                                                    className="upload-zone-hover"
                                                >
                                                    {isDragging ? (
                                                        <div style={{ color: 'var(--primary-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                            <Upload size={24} />
                                                            <p style={{ fontSize: '11px', fontWeight: '500' }}>释放文件以上传</p>
                                                        </div>
                                                    ) : file ? (
                                                        <div style={{ color: 'var(--success-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                            <FileText size={24} />
                                                            <span style={{ fontSize: '11px', fontWeight: '500', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                                                        </div>
                                                    ) : files.length > 0 ? (
                                                        <div style={{ color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                                            <Package size={20} />
                                                            <span style={{ fontSize: '11px', fontWeight: '500' }}>添加更多文件</span>
                                                            <span style={{ fontSize: '10px', opacity: 0.7 }}>点击或拖拽添加</span>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                                            <div style={{
                                                                width: '40px',
                                                                height: '40px',
                                                                borderRadius: '50%',
                                                                background: 'rgba(59, 130, 246, 0.1)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                marginBottom: '4px',
                                                                border: '1px solid rgba(59, 130, 246, 0.2)'
                                                            }}>
                                                                <Upload size={20} color="var(--primary-color)" />
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                                                    添加 PDF 文件（支持多选）
                                                                </span>
                                                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                                    支持拖拽或点击选择
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <input id="ref-upload-side" type="file" multiple className="hidden" accept="application/pdf" onChange={handleFileUpload} />
                                                </div>
                                            </div>

                                            {/* Execute Button - Moved here */}
                                            <button
                                                className="btn-primary"
                                                onClick={isBatchMode ? handleBatchExecute : handleExecute}
                                                disabled={(!file && files.length === 0) || loading}
                                                style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: ((!file && files.length === 0) || loading) ? 0.6 : 1 }}
                                            >
                                                {loading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                                                {loading ? `处理中${isBatchMode ? ` (${batchResults.size}/${files.length})` : '...'}` : (isBatchMode ? `批量提取 (${files.length} 个文件)` : '开始提取数据')}
                                            </button>

                                            {/* File Queue List - Moved below button */}
                                            {files.length > 0 && (
                                                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                                                    <div style={{
                                                        fontSize: '11px',
                                                        color: 'var(--text-secondary)',
                                                        marginBottom: '6px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between'
                                                    }}>
                                                        <span>待处理队列 ({files.length})</span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                setFiles([]);
                                                                setIsBatchMode(false);
                                                                setBatchResults(new Map());
                                                            }}
                                                            style={{
                                                                fontSize: '10px',
                                                                padding: '2px 6px',
                                                                borderRadius: '4px',
                                                                border: '1px solid var(--glass-border)',
                                                                background: 'var(--input-bg)',
                                                                color: 'var(--text-secondary)',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s ease'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                                                e.currentTarget.style.borderColor = '#ef4444';
                                                                e.currentTarget.style.color = '#ef4444';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.background = 'var(--input-bg)';
                                                                e.currentTarget.style.borderColor = 'var(--glass-border)';
                                                                e.currentTarget.style.color = 'var(--text-secondary)';
                                                            }}
                                                        >
                                                            清空全部
                                                        </button>
                                                    </div>
                                                    <div style={{
                                                        flex: 1,
                                                        overflowY: 'auto',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '8px',
                                                        padding: '2px'
                                                    }} className="custom-scrollbar">
                                                        {files.map((f, i) => {
                                                            const isProcessing = processingIndex === i || (loading && !isBatchMode && file?.name === f.name);
                                                            return (
                                                                <div
                                                                    key={`queue-${f.name}-${i}`}
                                                                    style={{
                                                                        padding: '10px 12px',
                                                                        borderRadius: '10px',
                                                                        background: isProcessing ? 'rgba(59, 130, 246, 0.05)' : 'var(--input-bg)',
                                                                        border: isProcessing ? '1px solid var(--primary-color)' : '1px solid var(--glass-border)',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '10px',
                                                                        transition: 'all 0.3s ease',
                                                                        animation: 'slideUp 0.3s ease'
                                                                    }}
                                                                    className="file-queue-item"
                                                                >
                                                                    {/* Status Icon */}
                                                                    <div style={{
                                                                        width: '32px',
                                                                        height: '32px',
                                                                        minWidth: '32px',
                                                                        borderRadius: '8px',
                                                                        background: isProcessing ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        border: `1px solid ${isProcessing ? 'var(--primary-color)' : 'var(--glass-border)'}`
                                                                    }}>
                                                                        {isProcessing ? (
                                                                            <RefreshCw size={14} className="animate-spin" color="var(--primary-color)" />
                                                                        ) : (
                                                                            <FileText size={14} color="var(--text-secondary)" />
                                                                        )}
                                                                    </div>

                                                                    {/* File Info */}
                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                        <div style={{
                                                                            fontSize: '12px',
                                                                            fontWeight: '500',
                                                                            color: 'var(--text-primary)',
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                            whiteSpace: 'nowrap'
                                                                        }}>
                                                                            {f.name}
                                                                        </div>
                                                                        <div style={{
                                                                            fontSize: '10px',
                                                                            color: isProcessing ? 'var(--primary-color)' : 'var(--text-secondary)',
                                                                            marginTop: '2px'
                                                                        }}>
                                                                            {isProcessing ? '处理中...' : '待处理'}
                                                                        </div>
                                                                    </div>

                                                                    {/* Delete Button */}
                                                                    {!isProcessing && (
                                                                        <button
                                                                            onClick={(e) => handleDeleteQueueItem(i, e)}
                                                                            style={{
                                                                                background: 'none',
                                                                                border: 'none',
                                                                                padding: '4px',
                                                                                cursor: 'pointer',
                                                                                color: 'var(--text-secondary)',
                                                                                opacity: 0.6,
                                                                                transition: 'all 0.2s ease',
                                                                                borderRadius: '6px'
                                                                            }}
                                                                            onMouseEnter={(e) => {
                                                                                e.currentTarget.style.opacity = '1';
                                                                                e.currentTarget.style.color = '#ef4444';
                                                                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                                                            }}
                                                                            onMouseLeave={(e) => {
                                                                                e.currentTarget.style.opacity = '0.6';
                                                                                e.currentTarget.style.color = 'var(--text-secondary)';
                                                                                e.currentTarget.style.background = 'none';
                                                                            }}
                                                                            title="移除"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                        </div>
                                    )}

                                    {/* History Tab */}
                                    {activeTab === 'history' && (
                                        <div style={{
                                            flex: 1,
                                            padding: '15px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '10px',
                                            animation: 'fadeIn 0.3s ease',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                    共 {history.length} 条记录
                                                </span>
                                                {history.length > 0 && selectedHistory.size > 0 && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <button
                                                            onClick={handleBatchDeleteHistory}
                                                            style={{
                                                                background: 'rgba(239, 68, 68, 0.1)',
                                                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                                                color: '#ef4444',
                                                                fontSize: '10px',
                                                                padding: '4px 8px',
                                                                borderRadius: '6px',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px'
                                                            }}
                                                        >
                                                            <Trash2 size={10} /> 删除({selectedHistory.size})
                                                        </button>
                                                        <div
                                                            onClick={toggleSelectAllHistory}
                                                            style={{
                                                                width: '16px',
                                                                height: '16px',
                                                                borderRadius: '3px',
                                                                border: '1px solid var(--glass-border)',
                                                                background: selectedHistory.size === history.length && history.length > 0 ? 'var(--primary-color)' : 'transparent',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer'
                                                            }}
                                                            title="全选/取消全选"
                                                        >
                                                            {selectedHistory.size === history.length && history.length > 0 && <Check size={10} color="white" />}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }} className="custom-scrollbar">
                                                {/* 统一的提取记录列表 (Pending + Processing + History) */}
                                                {files.length === 0 && history.length === 0 ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.4, gap: '10px' }}>
                                                        <Clock size={32} />
                                                        <span style={{ fontSize: '12px' }}>暂无记录</span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {/* 待处理/处理中的任务 */}
                                                        {files.map((f, i) => {
                                                            const isProcessing = processingIndex === i || (loading && !isBatchMode && file?.name === f.name);
                                                            return (
                                                                <div
                                                                    key={`queue-${f.name}-${i}`}
                                                                    style={{
                                                                        padding: '10px',
                                                                        borderRadius: '10px',
                                                                        background: isProcessing ? 'rgba(59, 130, 246, 0.05)' : 'var(--input-bg)',
                                                                        border: isProcessing ? '1px solid var(--primary-color)' : '1px solid var(--glass-border)',
                                                                        opacity: 1,
                                                                        transition: 'all 0.2s',
                                                                        cursor: 'default'
                                                                    }}
                                                                >
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        <span style={{
                                                                            fontSize: '11px',
                                                                            fontWeight: 'bold',
                                                                            color: 'var(--text-primary)',
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                            whiteSpace: 'nowrap',
                                                                            flex: 1
                                                                        }}>
                                                                            {f.name}
                                                                        </span>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            {isProcessing ? (
                                                                                <RefreshCw size={12} className="animate-spin" color="var(--primary-color)" />
                                                                            ) : (
                                                                                <Clock size={12} color="var(--text-secondary)" opacity={0.5} />
                                                                            )}
                                                                            <button
                                                                                onClick={(e) => handleDeleteQueueItem(i, e)}
                                                                                style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: '#ef4444' }}
                                                                            >
                                                                                <Trash2 size={12} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                                        {isProcessing ? '处理中...' : '待提取'}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}

                                                        {/* 已完成的历史记录 */}
                                                        {history.map((h, hIdx) => (
                                                            <div
                                                                key={`history-${h.index}`}
                                                                onClick={() => handleViewHistory(h.index)}
                                                                style={{
                                                                    padding: '10px',
                                                                    borderRadius: '10px',
                                                                    background: selectedHistoryIndex === h.index ? 'rgba(59, 130, 246, 0.1)' : 'var(--input-bg)',
                                                                    border: selectedHistory.has(h.index) ? '1px solid var(--primary-color)' : '1px solid var(--glass-border)',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s',
                                                                    display: 'flex',
                                                                    gap: '8px',
                                                                    alignItems: 'flex-start'
                                                                }}
                                                                className="list-item-hover"
                                                            >
                                                                <div
                                                                    onClick={(e) => toggleHistorySelection(h.index, e)}
                                                                    style={{
                                                                        marginTop: '2px',
                                                                        width: '14px',
                                                                        minWidth: '14px',
                                                                        height: '14px',
                                                                        borderRadius: '3px',
                                                                        border: '1px solid var(--glass-border)',
                                                                        background: selectedHistory.has(h.index) ? 'var(--primary-color)' : 'transparent',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center'
                                                                    }}
                                                                >
                                                                    {selectedHistory.has(h.index) && <Check size={10} color="white" />}
                                                                </div>
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{h.filename}</span>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            <CheckCircle size={12} color="var(--success-color)" />
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{h.template_name}</span>
                                                                        <span style={{ fontSize: '9px', opacity: 0.5 }}>
                                                                            {new Date(h.timestamp).toLocaleString('zh-CN', {
                                                                                year: 'numeric', month: '2-digit', day: '2-digit',
                                                                                hour: '2-digit', minute: '2-digit', second: '2-digit',
                                                                                hour12: false
                                                                            }).replace(/\//g, '-')}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </aside>
                {/* Results Panel */}
                <div className="glass-card" style={{
                    padding: '0',
                    overflow: 'hidden',
                    height: headerCollapsed ? 'calc(100vh - 76px)' : 'calc(100vh - 100px)',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '16px',
                    position: 'sticky',
                    top: '20px'
                }}>
                    <div style={{
                        padding: '15px 24px',
                        borderBottom: '1px solid var(--glass-border)',
                        background: 'rgba(255,255,255,0.03)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: 'rgba(59, 130, 246, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--primary-color)'
                            }}>
                                <Package size={18} />
                            </div>
                            <span style={{ fontSize: '15px', fontWeight: 'bold' }}>提取结果预览</span>
                        </div>

                        {result && (
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', background: 'var(--input-bg)', padding: '3px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                                    {[
                                        { id: 'json', label: 'JSON', icon: <FileJson size={14} /> },
                                        { id: 'markdown', label: 'MD', icon: <FileText size={14} /> },
                                        { id: 'csv', label: 'CSV', icon: <FileSpreadsheet size={14} /> },
                                        { id: 'xml', label: 'XML', icon: <FileCode size={14} /> }
                                    ].map(f => (
                                        <button
                                            key={f.id}
                                            onClick={() => setOutputFormat(f.id)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '5px',
                                                padding: '5px 12px', borderRadius: '8px', border: 'none',
                                                background: outputFormat === f.id ? 'var(--primary-color)' : 'transparent',
                                                color: outputFormat === f.id ? 'white' : 'var(--text-secondary)',
                                                cursor: 'pointer', transition: 'all 0.2s ease', fontSize: '12px', fontWeight: 'bold'
                                            }}
                                        >
                                            {f.icon}
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ padding: '30px', flex: 1, overflow: 'auto' }}>
                        {!result ? (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexDirection: 'column', gap: '20px', opacity: 0.5 }}>
                                <div style={{ width: '144px', height: '144px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FileText size={64} style={{ opacity: 0.3 }} />
                                </div>
                                <p style={{ fontSize: '1.2rem', fontWeight: '500' }}>待执行: 请上传文件并点击"开始提取"</p>
                            </div>
                        ) : (
                            <div className="animate-fade-in">
                                <div style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '4px' }}>{result.filename}</h3>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>{result.template_name}</span>
                                            <span style={{ opacity: 0.5 }}>·</span>
                                            <span>
                                                {new Date(result.timestamp || new Date()).toLocaleString('zh-CN', {
                                                    year: 'numeric', month: '2-digit', day: '2-digit',
                                                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                                                    hour12: false
                                                }).replace(/\//g, '-')}
                                            </span>
                                        </div>
                                    </div>
                                    {result.status === 'error' ? (
                                        <div style={{
                                            padding: '6px 16px',
                                            borderRadius: '8px',
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            color: 'var(--error-color, #ef4444)',
                                            fontSize: '11px',
                                            fontWeight: 'bold',
                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <AlertCircle size={14} />
                                            <span>解析失败</span>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={handleCopy}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    background: 'var(--input-bg)',
                                                    border: '1px solid var(--glass-border)',
                                                    borderRadius: '6px',
                                                    padding: '6px 12px',
                                                    cursor: 'pointer',
                                                    fontSize: '11px',
                                                    color: 'var(--text-primary)',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--input-bg)'}
                                            >
                                                {copied ? <><Check size={12} /> 已复制</> : <><Copy size={12} /> 复制</>}
                                            </button>
                                            <button
                                                onClick={handleDownload}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    background: 'var(--input-bg)',
                                                    border: '1px solid var(--glass-border)',
                                                    borderRadius: '6px',
                                                    padding: '6px 12px',
                                                    cursor: 'pointer',
                                                    fontSize: '11px',
                                                    color: 'var(--text-primary)',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--input-bg)'}
                                            >
                                                <Download size={12} /> 下载
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {outputFormat === 'markdown' && (
                                    <pre className="custom-scrollbar" style={{
                                        background: 'rgba(15, 23, 42, 0.9)',
                                        padding: '24px',
                                        borderRadius: '16px',
                                        overflow: 'auto',
                                        fontSize: '13px',
                                        lineHeight: '1.6',
                                        border: '1px solid var(--glass-border)',
                                        animation: 'slideUp 0.3s ease',
                                        maxHeight: '600px',
                                        color: '#cbd5e1',
                                        fontFamily: 'monospace',
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        {getMarkdown()}
                                    </pre>
                                )}

                                {outputFormat === 'json' && (
                                    <div style={{ animation: 'slideUp 0.3s ease' }}>
                                        {renderJsonWithHighlight(getJson())}
                                    </div>
                                )}

                                {outputFormat === 'xml' && renderXmlWithHighlight()}

                                {outputFormat === 'csv' && (
                                    <pre className="custom-scrollbar" style={{
                                        background: 'rgba(15, 23, 42, 0.9)',
                                        padding: '24px',
                                        borderRadius: '16px',
                                        overflow: 'auto',
                                        fontSize: '13px',
                                        lineHeight: '1.6',
                                        border: '1px solid var(--glass-border)',
                                        animation: 'slideUp 0.3s ease',
                                        maxHeight: '600px',
                                        color: '#cbd5e1',
                                        fontFamily: 'monospace',
                                        whiteSpace: 'pre'
                                    }}>
                                        {getCsv().replace(/^\uFEFF/, '')}
                                    </pre>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div >
        </div >
    );
}
