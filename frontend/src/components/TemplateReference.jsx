import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Upload, FileText, Play, Clock, CheckCircle, Copy, Download, Layout, FileJson, FileCode, Check, Search, ChevronDown, Sparkles, User, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

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
    const dropdownRef = useRef(null);

    useEffect(() => {
        fetchTemplates();
        fetchHistory();

        // Handle click outside to close dropdown
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
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
            <div style={{ display: 'grid', gridTemplateColumns: isPanelCollapsed ? '0px 1fr' : '300px 1fr', gap: '20px', alignItems: 'start', transition: 'grid-template-columns 0.3s ease' }}>

                {/* Control Panel */}
                <div className="glass-card" style={{ padding: '15px', overflow: 'hidden', width: isPanelCollapsed ? '0' : '300px', opacity: isPanelCollapsed ? 0 : 1, transition: 'width 0.3s ease, opacity 0.3s ease' }}>

                    {/* 1. Mode Selector */}
                    <div style={{ marginBottom: '20px' }}>

                        <div style={{ display: 'flex', gap: '8px', background: 'var(--input-bg)', padding: '4px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                            <button
                                onClick={() => { setSelectionMode('auto'); setSelectedTemplate('auto'); }}
                                style={{
                                    flex: 1, padding: '8px', borderRadius: '6px', border: 'none',
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
                                    flex: 1, padding: '8px', borderRadius: '6px', border: 'none',
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
                    </div>

                    {/* 2. Searchable Custom Select */}
                    <div style={{ marginBottom: '20px', position: 'relative' }} ref={dropdownRef}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>选定目标模板</label>
                        <div
                            style={{
                                width: '100%', padding: '8px 12px', borderRadius: '10px',
                                border: '1px solid var(--glass-border)', background: 'var(--input-bg)',
                                cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <span style={{ fontSize: '13px', color: selectedTemplate ? 'var(--text-primary)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {getSelectedName()}
                            </span>
                            <ChevronDown size={16} style={{ opacity: 0.5, transition: 'transform 0.3s', transform: isDropdownOpen ? 'rotate(180deg)' : 'none' }} />
                        </div>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <div className="glass-card animate-slide-up" style={{
                                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
                                zIndex: 1000, padding: '8px', border: '1px solid var(--glass-border)',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.4)', background: 'var(--glass-bg)',
                                backdropFilter: 'blur(20px)', borderRadius: '12px'
                            }}>
                                {/* Search Input inside dropdown */}
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

                                {/* List items */}
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

                                    {filteredTemplates.length === 0 && (selectionMode === 'custom' || searchQuery) && (
                                        <p style={{ padding: '15px', textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.6 }}>
                                            未发现匹配项
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>上传单据 (PDF)</label>
                        <div style={{
                            border: '1px dashed var(--glass-border)', borderRadius: '10px',
                            padding: '30px 15px', textAlign: 'center', cursor: 'pointer',
                            background: 'rgba(255,255,255,0.02)',
                            transition: 'all 0.2s ease'
                        }} onClick={() => document.getElementById('ref-upload').click()} className="upload-zone-hover">
                            {file ? (
                                <div style={{ color: 'var(--success-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                    <FileText size={32} />
                                    <span style={{ fontSize: '12px', fontWeight: '500', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                                </div>
                            ) : (
                                <div style={{ color: 'var(--text-secondary)' }}>
                                    <Upload size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                                    <p style={{ fontSize: '11px' }}>点击或拖拽 PDF</p>
                                </div>
                            )}
                            <input id="ref-upload" type="file" className="hidden" accept="application/pdf" onChange={handleFileUpload} />
                        </div>
                    </div>

                    <button
                        className="btn-primary"
                        onClick={handleExecute}
                        disabled={!file || loading || (selectionMode === 'custom' && !selectedTemplate)}
                        style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: 'bold', opacity: (!file || loading || (selectionMode === 'custom' && !selectedTemplate)) ? 0.6 : 1 }}
                    >
                        {loading ? '正在处理...' : (
                            <><Play size={16} style={{ marginRight: '6px' }} /> 开始提取数据</>
                        )}
                    </button>

                    {/* Execution History Mini-list */}
                    <div style={{ marginTop: '30px' }}>
                        <h3 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                            <Clock size={14} /> 最近提取历史
                        </h3>
                        <div style={{ maxHeight: '250px', overflowY: 'auto', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                            {history.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '11px', padding: '15px', textAlign: 'center' }}>暂无记录</p>}
                            {history.map((h, i) => (
                                <div
                                    key={i}
                                    onClick={() => handleViewHistory(h.index)}
                                    style={{
                                        padding: '10px 12px',
                                        borderBottom: i === history.length - 1 ? 'none' : '1px solid var(--glass-border)',
                                        fontSize: '11px',
                                        background: selectedHistoryIndex === h.index ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.01)',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s ease',
                                        position: 'relative'
                                    }}
                                    className="list-item-hover"
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                                        <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '10px', flex: 1 }}>
                                            {h.filename}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                            <span style={{ opacity: 0.5, fontSize: '10px' }}>{new Date(h.timestamp).toLocaleTimeString()}</span>
                                            <button
                                                onClick={(e) => handleDeleteHistory(h.index, e)}
                                                title="删除记录"
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    padding: '4px',
                                                    cursor: 'pointer',
                                                    color: '#ef4444',
                                                    display: 'flex'
                                                }}
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                            <CheckCircle size={12} color="var(--success-color)" />
                                        </div>
                                    </div>
                                    <div style={{ color: "var(--text-secondary)", fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        模板: {h.template_name || "未知模板"}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Results Panel */}
                <div className="glass-card" style={{ padding: '0', overflow: 'hidden', minHeight: '650px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{
                        padding: '15px 24px',
                        borderBottom: '1px solid var(--glass-border)',
                        background: 'rgba(255,255,255,0.03)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button
                                onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
                                className="icon-btn"
                                title={isPanelCollapsed ? "展开控制面板" : "折叠控制面板"}
                                style={{ padding: '6px' }}
                            >
                                {isPanelCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                            </button>
                            <Layout size={18} className="text-primary" />
                            提取结果导出
                        </div>

                        {result && (
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', background: 'var(--input-bg)', padding: '4px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
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
                                                padding: '6px 12px', borderRadius: '8px', border: 'none',
                                                background: outputFormat === f.id ? 'var(--primary-color)' : 'transparent',
                                                color: outputFormat === f.id ? 'white' : 'var(--text-secondary)',
                                                cursor: 'pointer', transition: 'all 0.2s ease', fontSize: '13px', fontWeight: 'bold'
                                            }}
                                        >
                                            {f.icon}
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)', margin: '0 5px' }} />
                                <button className="icon-btn" title="拷贝" onClick={handleCopy}>
                                    {copied ? <Check size={18} className="text-success" /> : <Copy size={18} />}
                                </button>
                                <button className="icon-btn" title="下载" onClick={handleDownload}>
                                    <Download size={18} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div style={{ padding: '30px', flex: 1, overflow: 'auto' }}>
                        {!result ? (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexDirection: 'column', gap: '20px', opacity: 0.5 }}>
                                <div style={{ padding: '30px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }}>
                                    <FileText size={64} />
                                </div>
                                <p style={{ fontSize: '1.1rem' }}>待执行:请上传文件并点击"开始提取"</p>
                            </div>
                        ) : (
                            <div className="animate-fade-in">
                                <div style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
                                    <div style={{ padding: '8px 16px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-color)', fontSize: '13px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                        匹配模板: <b>{result.template_name}</b>
                                    </div>
                                    <div style={{ padding: '8px 16px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', fontSize: '13px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                        状态: <b>识别成功</b>
                                    </div>
                                </div>

                                {outputFormat === 'markdown' && (
                                    <div style={{ animation: 'slideUp 0.3s ease' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                            <thead>
                                                <tr style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary-color)' }}>
                                                    <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid var(--glass-border)' }}>字段名称</th>
                                                    <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid var(--glass-border)' }}>提取内容</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries(result.data).map(([k, item], idx) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid var(--glass-border)', background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                                                        <td style={{ padding: '12px 15px', fontWeight: 'bold', color: 'var(--text-secondary)', width: '150px', verticalAlign: 'top' }}>
                                                            <div style={{ marginBottom: '6px', fontSize: '13px' }}>{k}</div>
                                                            <div style={{ fontSize: '10px', opacity: 0.6, fontWeight: 'normal', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                <div><span style={{ opacity: 0.5 }}>类型:</span> <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{item.type}</code></div>
                                                                {item.label && <div><span style={{ opacity: 0.5 }}>标签:</span> {item.label}</div>}
                                                                {item.remarks && <div><span style={{ opacity: 0.5 }}>备注:</span> {item.remarks}</div>}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '12px 15px', color: 'var(--text-primary)' }}>
                                                            {Array.isArray(item.content) ? (
                                                                <div style={{ overflowX: 'auto', padding: '4px' }}>
                                                                    <table style={{ borderCollapse: 'collapse', fontSize: '12px', width: '100%', border: '1px solid var(--glass-border)' }}>
                                                                        <tbody>
                                                                            {item.content.map((row, rIdx) => (
                                                                                <tr key={rIdx} style={{ background: rIdx === 0 ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                                                                                    {row.map((cell, cIdx) => (
                                                                                        <td key={cIdx} style={{ padding: '6px 10px', border: '1px solid var(--glass-border)', fontWeight: rIdx === 0 ? 'bold' : 'normal' }}>
                                                                                            {cell}
                                                                                        </td>
                                                                                    ))}
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            ) : (
                                                                String(item.content)
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div style={{ marginTop: '20px', fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                            提示:此表格为实时渲染的 Markdown 预览
                                        </div>
                                    </div>
                                )}

                                {outputFormat === 'json' && (
                                    <pre style={{
                                        background: 'rgba(0,0,0,0.3)',
                                        padding: '20px', borderRadius: '12px',
                                        overflowX: 'auto', fontSize: '14px', lineHeight: '1.6',
                                        border: '1px solid var(--glass-border)',
                                        animation: 'slideUp 0.3s ease'
                                    }}>
                                        {JSON.stringify(getJson(), null, 2)}
                                    </pre>
                                )}

                                {outputFormat === 'xml' && (
                                    <pre style={{
                                        background: 'rgba(0,0,0,0.3)',
                                        padding: '20px', borderRadius: '12px',
                                        overflowX: 'auto', fontSize: '14px', lineHeight: '1.6',
                                        border: '1px solid var(--glass-border)',
                                        animation: 'slideUp 0.3s ease'
                                    }}>
                                        {getXml()}
                                    </pre>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
