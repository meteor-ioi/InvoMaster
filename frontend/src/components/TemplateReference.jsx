import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, FileText, Play, Clock, CheckCircle, Copy, Download, Layout, FileJson, FileCode, Check } from 'lucide-react';

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

    useEffect(() => {
        fetchTemplates();
        fetchHistory();
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

    const handleFileUpload = (e) => {
        if (e.target.files[0]) setFile(e.target.files[0]);
    };

    const handleExecute = async () => {
        if (!file) return alert("请先上传文件");
        setLoading(true);
        setResult(null);
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
        let md = `| 字段 | 提取内容 |\n| --- | --- |\n`;
        Object.entries(result.data).forEach(([k, v]) => {
            md += `| ${k} | ${String(v).replace(/\n/g, ' ')} |\n`;
        });
        return md;
    };

    const getJsonArray = () => {
        if (!result) return [];
        return [
            ["字段", "内容"],
            ...Object.entries(result.data).map(([k, v]) => [k, v])
        ];
    };

    const getXml = () => {
        if (!result) return "";
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<extraction_result>\n`;
        xml += `  <metadata>\n    <filename>${result.filename}</filename>\n    <template>${result.template_name}</template>\n  </metadata>\n`;
        xml += `  <data>\n`;
        Object.entries(result.data).forEach(([k, v]) => {
            xml += `    <field name="${k}">${v}</field>\n`;
        });
        xml += `  </data>\n</extraction_result>`;
        return xml;
    };

    const handleCopy = () => {
        let text = "";
        if (outputFormat === 'markdown') text = getMarkdown();
        else if (outputFormat === 'json') text = JSON.stringify(getJsonArray(), null, 2);
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
        else if (outputFormat === 'json') { content = JSON.stringify(getJsonArray(), null, 2); ext = "json"; type = "application/json"; }
        else if (outputFormat === 'xml') { content = getXml(); ext = "xml"; type = "application/xml"; }

        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `extraction_${new Date().getTime()}.${ext}`;
        a.click();
    };

    const groupedTemplates = React.useMemo(() => {
        const groups = { auto: [], custom: [] };
        templates.forEach(t => {
            const mode = t.mode || 'auto';
            if (groups[mode]) groups[mode].push(t);
        });
        return groups;
    }, [templates]);

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 20px 40px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 400px) 1fr', gap: '20px', alignItems: 'start' }}>
                {/* Control Panel */}
                <div className="glass-card" style={{ padding: '24px' }}>
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>选择模板</label>
                        <select
                            value={selectedTemplate}
                            onChange={(e) => setSelectedTemplate(e.target.value)}
                            style={{
                                width: '100%', padding: '10px', borderRadius: '12px',
                                border: '1px solid var(--glass-border)', background: 'var(--input-bg)', color: 'var(--text-primary)',
                                outline: 'none'
                            }}
                        >
                            <option value="auto">⚡️ 自动识别匹配 (Auto Detect)</option>

                            {groupedTemplates.auto.length > 0 && (
                                <optgroup label="标准模式 (AI Standard)">
                                    {groupedTemplates.auto.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </optgroup>
                            )}

                            {groupedTemplates.custom.length > 0 && (
                                <optgroup label="自定义模式 (Custom User)">
                                    {groupedTemplates.custom.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>上传单据 (PDF)</label>
                        <div style={{
                            border: '2px dashed var(--glass-border)', borderRadius: '12px',
                            padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
                            background: 'rgba(255,255,255,0.02)',
                            transition: 'all 0.2s ease'
                        }} onClick={() => document.getElementById('ref-upload').click()} className="upload-zone-hover">
                            {file ? (
                                <div style={{ color: 'var(--success-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                    <FileText size={40} />
                                    <span style={{ fontWeight: '500' }}>{file.name}</span>
                                </div>
                            ) : (
                                <div style={{ color: 'var(--text-secondary)' }}>
                                    <Upload size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
                                    <p>点击选择或直接拖拽 PDF 文件</p>
                                </div>
                            )}
                            <input id="ref-upload" type="file" className="hidden" accept="application/pdf" onChange={handleFileUpload} />
                        </div>
                    </div>

                    <button
                        className="btn-primary"
                        onClick={handleExecute}
                        disabled={!file || loading}
                        style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '1rem', opacity: (!file || loading) ? 0.6 : 1 }}
                    >
                        {loading ? '正在识别提取...' : (
                            <><Play size={18} style={{ marginRight: '8px' }} /> 开始提取数据</>
                        )}
                    </button>

                    {/* Execution History Mini-list */}
                    <div style={{ marginTop: '40px' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.8 }}>
                            <Clock size={16} /> 最近提取历史
                        </h3>
                        <div style={{ maxHeight: '300px', overflowY: 'auto', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                            {history.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '20px', textAlign: 'center' }}>暂无记录</p>}
                            {history.map((h, i) => (
                                <div key={i} style={{
                                    padding: '12px 16px', borderBottom: i === history.length - 1 ? 'none' : '1px solid var(--glass-border)',
                                    fontSize: '0.85rem',
                                    background: 'rgba(255,255,255,0.01)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: 'bold' }}>{h.filename}</span>
                                        <span style={{ opacity: 0.5 }}>{new Date(h.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: "var(--text-secondary)" }}>
                                        <span>{h.template_name || "未知模板"}</span>
                                        <CheckCircle size={14} color="var(--success-color)" />
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
                        <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                                <p style={{ fontSize: '1.1rem' }}>待执行：请上传文件并点击“开始提取”</p>
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
                                                {Object.entries(result.data).map(([k, v], idx) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid var(--glass-border)', background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                                                        <td style={{ padding: '12px 15px', fontWeight: 'bold', color: 'var(--text-secondary)', width: '30%' }}>{k}</td>
                                                        <td style={{ padding: '12px 15px', color: 'var(--text-primary)' }}>{v}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div style={{ marginTop: '20px', fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                            提示：此表格为实时渲染的 Markdown 预览
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
                                        {JSON.stringify(getJsonArray(), null, 2)}
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
