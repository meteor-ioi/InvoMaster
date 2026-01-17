import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Upload, FileText, Play, Clock, CheckCircle, Copy, Download, Layout, FileJson, FileCode, Check, Search, ChevronDown, Sparkles, User, ChevronLeft, ChevronRight, Trash2, Package, RefreshCw } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

export default function TemplateReference() {
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState('auto');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState([]);
    const [outputFormat, setOutputFormat] = useState('markdown'); // 'markdown', 'json', 'xml'
    const [copied, setCopied] = useState(false);
    const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(null);

    // --- Search & Mode States ---
    const [selectionMode, setSelectionMode] = useState('auto'); // 'auto' (Standard) or 'custom' (Custom)
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
    const [isHoveringToggle, setIsHoveringToggle] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        fetchTemplates();
        fetchHistory();

        const handleToggleSidebars = (e) => {
            setIsPanelCollapsed(e.detail.collapsed);
        };

        window.addEventListener('toggle-sidebars', handleToggleSidebars);

        // Handle click outside to close dropdown
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('toggle-sidebars', handleToggleSidebars);
        };
    }, []);

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
        e.stopPropagation(); // Prevent triggering the click event
        if (!confirm('确定要删除这条历史记录吗?')) return;

        try {
            await axios.delete(`${API_BASE}/history/${index}`);
            // If the deleted item was selected, clear the result
            if (selectedHistoryIndex === index) {
                setResult(null);
                setSelectedHistoryIndex(null);
            }
            fetchHistory(); // Refresh the list
        } catch (err) {
            console.error("Failed to delete history", err);
            alert("删除失败: " + (err.response?.data?.detail || err.message));
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
                data: historyItem.result_summary
            });
            setSelectedHistoryIndex(index);
        } catch (err) {
            console.error("Failed to load history item", err);
            alert("加载历史记录失败: " + (err.response?.data?.detail || err.message));
        }
    };

    const handleFileUpload = (e) => {
        if (e.target.files[0]) setFile(e.target.files[0]);
    };

    const handleExecute = async () => {
        if (!file) return alert("请先上传文件");
        setLoading(true);
        setResult(null);
        setSelectedHistoryIndex(null); // Clear history selection when executing new extraction
        try {
            const formData = new FormData();
            formData.append('file', file);

            let res;
            if (selectedTemplate === 'auto') {
                res = await axios.post(`${API_BASE}/analyze`, formData);
                const dataMap = {};
                (res.data.regions || []).forEach(r => {
                    const k = r.label || r.id;
                    dataMap[k] = r.text || "";
                });

                setResult({
                    status: 'success',
                    filename: res.data.filename,
                    template_name: res.data.template_found ? "自动匹配" : "无匹配模板",
                    data: dataMap,
                    raw_regions: res.data.regions
                });
            } else {
                res = await axios.post(`${API_BASE}/extract`, formData, {
                    params: { template_id: selectedTemplate }
                });
                setResult(res.data);
                fetchHistory(); // Refresh history
            }
        } catch (err) {
            console.error(err);
            alert("执行失败: " + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    };

    // --- Data Conversion Logic ---
    const getMarkdown = () => {
        if (!result) return "";
        let md = "";

        Object.entries(result.data).forEach(([regionId, item]) => {
            const { type, label, remarks, content } = item;

            // 区域标题
            md += `## ${label || regionId}\n\n`;

            // 元数据信息
            md += `**区域ID**: \`${regionId}\` | **类型**: \`${type}\`\n\n`;
            if (remarks) {
                md += `> **业务备注**: ${remarks}\n\n`;
            }

            // 根据类型渲染内容
            if (type === 'table' && Array.isArray(content)) {
                // 表格类型:渲染为 Markdown 表格
                if (content.length > 0) {
                    md += `| ${content[0].join(' | ')} |\n`;
                    md += `| ${content[0].map(() => '---').join(' | ')} |\n`;
                    content.slice(1).forEach(row => {
                        md += `| ${row.join(' | ')} |\n`;
                    });
                }
            } else if (type === 'figure') {
                // 图片类型:使用引用块
                md += `> 🖼️ ${content || '(无文本内容)'}\n`;
            } else if (type === 'title') {
                // 标题类型:使用加粗
                md += `**${content}**\n`;
            } else {
                // 普通文本:直接显示
                md += `${content}\n`;
            }

            md += "\n---\n\n";
        });

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

        Object.entries(result.data).forEach(([regionId, item]) => {
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

    const handleCopy = () => {
        let text = "";
        if (outputFormat === 'markdown') text = getMarkdown();
        else if (outputFormat === 'json') text = JSON.stringify(getJson(), null, 2);
        else if (outputFormat === 'xml') text = getXml();

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

        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `extraction_${new Date().getTime()}.${ext}`;
        a.click();
    };

    // --- Filtered Templates Logic ---
    const filteredTemplates = templates.filter(t => {
        const matchesMode = (t.mode || 'auto') === selectionMode;
        const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesMode && matchesSearch;
    });

    const getSelectedName = () => {
        if (selectedTemplate === 'auto') return "⚡️ 自动识别匹配";
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
                    top: '0',
                    width: isPanelCollapsed ? '64px' : '300px',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '15px'
                }}>
                    {/* 悬浮切换按钮 */}
                    <div
                        style={{
                            position: 'absolute',
                            right: '-12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 100,
                            cursor: 'pointer',
                            opacity: isHoveringToggle ? 1 : 0.6,
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={() => setIsHoveringToggle(true)}
                        onMouseLeave={() => setIsHoveringToggle(false)}
                        onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
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
                            {isPanelCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                        </div>
                    </div>

                    {isPanelCollapsed ? (
                        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '20px 0', borderRadius: '16px' }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: selectionMode === 'auto' ? 'linear-gradient(135deg, #3b82f633, #8b5cf633)' : 'linear-gradient(135deg, #8b5cf633, #ec489933)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid var(--glass-border)',
                                color: selectionMode === 'auto' ? 'var(--primary-color)' : 'var(--accent-color)'
                            }}>
                                {selectionMode === 'auto' ? <Sparkles size={18} /> : <User size={18} />}
                            </div>

                            <div style={{ width: '20px', height: '1px', background: 'var(--glass-border)' }} />

                            <button
                                onClick={() => document.getElementById('ref-upload-collapsed').click()}
                                style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid var(--primary-color)', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--primary-color)', transition: 'all 0.2s' }}
                                title="上传 PDF"
                            >
                                <Upload size={18} />
                                <input id="ref-upload-collapsed" type="file" className="hidden" accept="application/pdf" onChange={handleFileUpload} />
                            </button>

                            <button
                                onClick={handleExecute}
                                disabled={!file || loading}
                                style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid var(--success-color)', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--success-color)', transition: 'all 0.2s', opacity: (!file || loading) ? 0.5 : 1 }}
                                title="开始提取"
                            >
                                <Play size={18} />
                            </button>

                            <button
                                onClick={() => setIsPanelCollapsed(false)}
                                style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid var(--text-secondary)', background: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.2s' }}
                                title="执行历史"
                            >
                                <Clock size={18} />
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Card 1: Extraction Settings */}
                            <div className="glass-card" style={{ padding: '15px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {/* Mode Selector */}
                                <div style={{ display: 'flex', gap: '8px', background: 'var(--input-bg)', padding: '4px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                                    <button
                                        onClick={() => { setSelectionMode('auto'); setSelectedTemplate('auto'); }}
                                        style={{
                                            flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                                            fontSize: '11px', cursor: 'pointer', transition: 'all 0.3s ease',
                                            background: selectionMode === 'auto' ? 'var(--primary-color)' : 'transparent',
                                            color: selectionMode === 'auto' ? '#fff' : 'var(--text-secondary)',
                                            fontWeight: selectionMode === 'auto' ? 'bold' : 'normal',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                        }}
                                    >
                                        <Sparkles size={12} /> 标准模式
                                    </button>
                                    <button
                                        onClick={() => { setSelectionMode('custom'); setSelectedTemplate(''); }}
                                        style={{
                                            flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                                            fontSize: '11px', cursor: 'pointer', transition: 'all 0.3s ease',
                                            background: selectionMode === 'custom' ? 'var(--accent-color)' : 'transparent',
                                            color: selectionMode === 'custom' ? '#fff' : 'var(--text-secondary)',
                                            fontWeight: selectionMode === 'custom' ? 'bold' : 'normal',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                        }}
                                    >
                                        <User size={12} /> 自定义模式
                                    </button>
                                </div>

                                {/* Template Select */}
                                <div style={{ position: 'relative' }} ref={dropdownRef}>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>选定目标模板</label>
                                    <div
                                        style={{
                                            width: '100%', padding: '8px 12px', borderRadius: '10px',
                                            border: '1px solid var(--glass-border)', background: 'var(--input-bg)',
                                            cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            boxSizing: 'border-box'
                                        }}
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    >
                                        <span style={{ fontSize: '13px', color: selectedTemplate ? 'var(--text-primary)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {getSelectedName()}
                                        </span>
                                        <ChevronDown size={16} style={{ opacity: 0.5, transition: 'transform 0.3s', transform: isDropdownOpen ? 'rotate(180deg)' : 'none' }} />
                                    </div>

                                    {isDropdownOpen && (
                                        <div className="glass-card animate-slide-up" style={{
                                            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
                                            zIndex: 1000, padding: '8px', border: '1px solid var(--glass-border)',
                                            boxShadow: '0 10px 40px rgba(0,0,0,0.4)', background: 'var(--glass-bg)',
                                            backdropFilter: 'blur(20px)', borderRadius: '12px'
                                        }}>
                                            <div style={{ position: 'relative', marginBottom: '8px' }}>
                                                <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                                                <input
                                                    type="text"
                                                    placeholder="搜索模板..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    autoFocus
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{
                                                        width: '100%', padding: '6px 10px 6px 30px', borderRadius: '6px',
                                                        border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)',
                                                        color: 'var(--text-primary)', fontSize: '12px', outline: 'none'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                {selectionMode === 'auto' && (
                                                    <div
                                                        onClick={() => { setSelectedTemplate('auto'); setIsDropdownOpen(false); setSearchQuery(''); }}
                                                        style={{
                                                            padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
                                                            background: selectedTemplate === 'auto' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                                            display: 'flex', alignItems: 'center', gap: '6px'
                                                        }}
                                                        className="list-item-hover"
                                                    >
                                                        <Sparkles size={12} className="text-primary" />
                                                        ⚡️ 自动识别匹配
                                                    </div>
                                                )}
                                                {filteredTemplates.map(t => (
                                                    <div
                                                        key={t.id}
                                                        onClick={() => { setSelectedTemplate(t.id); setIsDropdownOpen(false); setSearchQuery(''); }}
                                                        style={{
                                                            padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
                                                            background: selectedTemplate === t.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                                            display: 'flex', flexDirection: 'column', gap: '1px'
                                                        }}
                                                        className="list-item-hover"
                                                    >
                                                        <span style={{ fontWeight: '500' }}>{t.name}</span>
                                                        <code style={{ fontSize: '9px', opacity: 0.4 }}>ID: {t.id}</code>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* File Upload */}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>上传单据 (PDF)</label>
                                    <div style={{
                                        border: '1px dashed var(--glass-border)', borderRadius: '12px',
                                        padding: '24px 15px', textAlign: 'center', cursor: 'pointer',
                                        background: 'rgba(255,255,255,0.02)',
                                        transition: 'all 0.2s ease'
                                    }} onClick={() => document.getElementById('ref-upload-side').click()} className="upload-zone-hover">
                                        {file ? (
                                            <div style={{ color: 'var(--success-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                <FileText size={24} />
                                                <span style={{ fontSize: '11px', fontWeight: '500', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                                            </div>
                                        ) : (
                                            <div style={{ color: 'var(--text-secondary)' }}>
                                                <Upload size={24} style={{ marginBottom: '4px', opacity: 0.5 }} />
                                                <p style={{ fontSize: '10px' }}>点击或拖拽 PDF</p>
                                            </div>
                                        )}
                                        <input id="ref-upload-side" type="file" className="hidden" accept="application/pdf" onChange={handleFileUpload} />
                                    </div>
                                </div>

                                <button
                                    className="btn-primary"
                                    onClick={handleExecute}
                                    disabled={!file || loading || (selectionMode === 'custom' && !selectedTemplate)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: (!file || loading) ? 0.6 : 1 }}
                                >
                                    {loading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                                    {loading ? '处理中...' : '开始提取数据'}
                                </button>
                            </div>

                            {/* Card 2: Extraction History */}
                            <div className="glass-card" style={{ flex: 1, padding: '15px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '5px' }}>
                                    <Clock size={14} color="var(--accent-color)" />
                                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>最近提取历史</span>
                                </div>
                                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }} className="custom-scrollbar">
                                    {history.length === 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.4, gap: '10px' }}>
                                            <Clock size={24} />
                                            <span style={{ fontSize: '11px' }}>暂无记录</span>
                                        </div>
                                    ) : (
                                        history.map((h, i) => (
                                            <div
                                                key={i}
                                                onClick={() => handleViewHistory(h.index)}
                                                style={{
                                                    padding: '10px',
                                                    borderRadius: '10px',
                                                    background: selectedHistoryIndex === h.index ? 'rgba(59, 130, 246, 0.1)' : 'var(--input-bg)',
                                                    border: '1px solid var(--glass-border)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    position: 'relative'
                                                }}
                                                className="list-item-hover"
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{h.filename}</span>
                                                    <button
                                                        onClick={(e) => handleDeleteHistory(h.index, e)}
                                                        style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: '#ef4444', marginLeft: '6px' }}
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{h.template_name}</span>
                                                    <span style={{ fontSize: '9px', opacity: 0.5 }}>{new Date(h.timestamp).toLocaleTimeString()}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </aside>

                {/* Results Panel */}
                <div className="glass-card" style={{ padding: '0', overflow: 'hidden', minHeight: '700px', display: 'flex', flexDirection: 'column', borderRadius: '16px' }}>
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
                                        { id: 'markdown', label: 'MD', icon: <FileText size={14} /> },
                                        { id: 'json', label: 'JSON', icon: <FileJson size={14} /> },
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
                                <div style={{ width: '1px', height: '20px', background: 'var(--glass-border)', margin: '0 5px' }} />
                                <button className="icon-btn" title="拷贝内容" onClick={handleCopy} style={{ padding: '8px' }}>
                                    {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                                </button>
                                <button className="icon-btn" title="下载文件" onClick={handleDownload} style={{ padding: '8px' }}>
                                    <Download size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div style={{ padding: '30px', flex: 1, overflow: 'auto' }}>
                        {!result ? (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexDirection: 'column', gap: '20px', opacity: 0.5 }}>
                                <div style={{ padding: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
                                    <FileText size={64} style={{ opacity: 0.3 }} />
                                </div>
                                <p style={{ fontSize: '1.2rem', fontWeight: '500' }}>待执行: 请上传文件并点击"开始提取"</p>
                            </div>
                        ) : (
                            <div className="animate-fade-in">
                                <div style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
                                    <div style={{ padding: '8px 16px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-color)', fontSize: '13px', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Sparkles size={14} />
                                        <span>匹配模板: <b>{result.template_name}</b></span>
                                    </div>
                                    <div style={{ padding: '8px 16px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', fontSize: '13px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <CheckCircle size={14} />
                                        <span>状态: <b>解析成功</b></span>
                                    </div>
                                </div>

                                {outputFormat === 'markdown' && (
                                    <div style={{ animation: 'slideUp 0.3s ease' }}>
                                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                                            <thead>
                                                <tr style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                                                    <th style={{ padding: '15px 20px', textAlign: 'left', fontSize: '13px', color: 'var(--primary-color)', borderBottom: '1px solid var(--glass-border)' }}>字段定义</th>
                                                    <th style={{ padding: '15px 20px', textAlign: 'left', fontSize: '13px', color: 'var(--primary-color)', borderBottom: '1px solid var(--glass-border)' }}>核心提取值</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries(result.data).map(([k, item], idx) => (
                                                    <tr key={idx} style={{ background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                                                        <td style={{ padding: '15px 20px', verticalAlign: 'top', borderBottom: idx === Object.entries(result.data).length - 1 ? 'none' : '1px solid var(--glass-border)' }}>
                                                            <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px', color: 'var(--text-primary)' }}>{k}</div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary-color)' }} />
                                                                    类型: <code style={{ color: 'var(--primary-color)' }}>{item.type}</code>
                                                                </span>
                                                                {item.label && <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>🔖 标签: {item.label}</span>}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '15px 20px', color: 'var(--text-primary)', borderBottom: idx === Object.entries(result.data).length - 1 ? 'none' : '1px solid var(--glass-border)' }}>
                                                            {Array.isArray(item.content) ? (
                                                                <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.1)' }}>
                                                                    <table style={{ borderCollapse: 'collapse', fontSize: '12px', width: '100%' }}>
                                                                        <tbody>
                                                                            {item.content.map((row, rIdx) => (
                                                                                <tr key={rIdx} style={{ background: rIdx === 0 ? 'rgba(255,255,255,0.05)' : 'transparent', borderBottom: rIdx === item.content.length - 1 ? 'none' : '1px solid var(--glass-border)' }}>
                                                                                    {row.map((cell, cIdx) => (
                                                                                        <td key={cIdx} style={{ padding: '8px 12px', borderRight: cIdx === row.length - 1 ? 'none' : '1px solid var(--glass-border)', fontWeight: rIdx === 0 ? 'bold' : 'normal', color: rIdx === 0 ? 'var(--primary-color)' : 'inherit' }}>
                                                                                            {cell}
                                                                                        </td>
                                                                                    ))}
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            ) : (
                                                                <div style={{ lineHeight: '1.6', fontSize: '13px', whiteSpace: 'pre-wrap' }}>{String(item.content)}</div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {outputFormat === 'json' && (
                                    <pre className="custom-scrollbar" style={{
                                        background: 'rgba(0,0,0,0.3)',
                                        padding: '24px', borderRadius: '16px',
                                        overflow: 'auto', fontSize: '13px', lineHeight: '1.6',
                                        border: '1px solid var(--glass-border)',
                                        animation: 'slideUp 0.3s ease',
                                        maxHeight: '600px',
                                        color: '#34d399'
                                    }}>
                                        {JSON.stringify(getJson(), null, 2)}
                                    </pre>
                                )}

                                {outputFormat === 'xml' && (
                                    <pre className="custom-scrollbar" style={{
                                        background: 'rgba(0,0,0,0.3)',
                                        padding: '24px', borderRadius: '16px',
                                        overflow: 'auto', fontSize: '13px', lineHeight: '1.6',
                                        border: '1px solid var(--glass-border)',
                                        animation: 'slideUp 0.3s ease',
                                        maxHeight: '600px',
                                        color: '#60a5fa'
                                    }}>
                                        {getXml()}
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
