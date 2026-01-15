import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, FileText, Play, Code, Clock, CheckCircle } from 'lucide-react';
import ApiExampleModal from './ApiExampleModal';

const API_BASE = 'http://localhost:8000';

export default function TemplateReference() {
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState('auto');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [showApiModal, setShowApiModal] = useState(false);
    const [history, setHistory] = useState([]);

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
        // For 'auto', we might need logic, but for now force user to pick or use 'auto' (which might be the analyze endpoint).
        // Let's assume for Reference Mode, if they pick 'Auto', we use the analyze endpoint which does fingerprint matching.
        // If they pick a specific template, we use the new /extract endpoint.

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            let res;
            if (selectedTemplate === 'auto') {
                // Use /analyze logic which auto-detects
                res = await axios.post(`${API_BASE}/analyze`, formData);
                // Transform analyze result to match extract result format approximately
                const dataMap = {};
                (res.data.regions || []).forEach(r => {
                    const k = r.label || r.id;
                    dataMap[k] = r.text || "";
                });

                setResult({
                    status: 'success',
                    filename: res.data.filename,
                    template_name: res.data.template_found ? "Auto-Matched" : "No Template Matched",
                    data: dataMap,
                    raw_regions: res.data.regions
                });

            } else {
                // Use explicit /extract
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

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '80px 20px 40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 'bold' }}>模板引用与执行</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>选择模板或自动匹配，验证提取效果</p>
                </div>
                <button
                    className="btn-secondary"
                    onClick={() => setShowApiModal(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Code size={18} /> API 调用示例
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 400px) 1fr', gap: '30px', alignItems: 'start' }}>
                {/* Control Panel */}
                <div className="glass-card" style={{ padding: '24px' }}>
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>选择模板</label>
                        <select
                            value={selectedTemplate}
                            onChange={(e) => setSelectedTemplate(e.target.value)}
                            style={{
                                width: '100%', padding: '10px', borderRadius: '8px',
                                border: '1px solid var(--glass-border)', background: 'var(--input-bg)', color: 'var(--text-primary)'
                            }}
                        >
                            <option value="auto">⚡️ 自动匹配 (Auto Detect)</option>
                            {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name} ({t.id.slice(0, 8)}...)</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>上传单据 (PDF)</label>
                        <div style={{
                            border: '2px dashed var(--glass-border)', borderRadius: '8px',
                            padding: '30px 20px', textAlign: 'center', cursor: 'pointer',
                            background: 'rgba(255,255,255,0.02)'
                        }} onClick={() => document.getElementById('ref-upload').click()}>
                            {file ? (
                                <div style={{ color: 'var(--success-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <FileText size={20} />
                                    {file.name}
                                </div>
                            ) : (
                                <div style={{ color: 'var(--text-secondary)' }}>
                                    <Upload size={24} style={{ marginBottom: '8px' }} />
                                    <p>点击选择文件</p>
                                </div>
                            )}
                            <input id="ref-upload" type="file" className="hidden" accept="application/pdf" onChange={handleFileUpload} />
                        </div>
                    </div>

                    <button
                        className="btn-primary"
                        onClick={handleExecute}
                        disabled={!file || loading}
                        style={{ width: '100%', padding: '12px', opacity: (!file || loading) ? 0.6 : 1 }}
                    >
                        {loading ? '执行中...' : (
                            <><Play size={18} style={{ marginRight: '8px' }} /> 开始提取</>
                        )}
                    </button>

                    {/* Execution History Mini-list */}
                    <div style={{ marginTop: '40px' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={16} /> 最近执行记录
                        </h3>
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {history.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>暂无记录</p>}
                            {history.map((h, i) => (
                                <div key={i} style={{
                                    padding: '12px', borderBottom: '1px solid var(--glass-border)',
                                    fontSize: '0.9rem'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: 'bold' }}>{h.filename}</span>
                                        <span style={{ opacity: 0.6 }}>{new Date(h.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: "var(--text-secondary)" }}>
                                        <span>{h.template_name}</span>
                                        {/* Status indicator */}
                                        <CheckCircle size={14} color="var(--success-color)" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Results Panel */}
                <div className="glass-card" style={{ padding: '0', overflow: 'hidden', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{
                        padding: '15px 24px',
                        borderBottom: '1px solid var(--glass-border)',
                        background: 'rgba(255,255,255,0.02)',
                        fontWeight: 'bold'
                    }}>
                        提取结果预览
                    </div>

                    <div style={{ padding: '24px', flex: 1, overflow: 'auto' }}>
                        {!result ? (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexDirection: 'column', gap: '15px' }}>
                                <FileText size={48} style={{ opacity: 0.2 }} />
                                <p>请上传文件并执行以查看结果</p>
                            </div>
                        ) : (
                            <div>
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                    <div style={{ padding: '5px 12px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary-color)', fontSize: '12px' }}>
                                        Template: {result.template_name}
                                    </div>
                                    <div style={{ padding: '5px 12px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success-color)', fontSize: '12px' }}>
                                        Status: Success
                                    </div>
                                </div>

                                <h4 style={{ marginBottom: '10px', borderLeft: '3px solid var(--primary-color)', paddingLeft: '10px' }}>JSON Data</h4>
                                <pre style={{
                                    background: 'rgba(0,0,0,0.3)',
                                    padding: '15px', borderRadius: '8px',
                                    overflowX: 'auto', fontSize: '14px',
                                    marginBottom: '30px'
                                }}>
                                    {JSON.stringify(result.data, null, 2)}
                                </pre>

                                <h4 style={{ marginBottom: '10px', borderLeft: '3px solid var(--primary-color)', paddingLeft: '10px' }}>Markdown Table Preview</h4>
                                { /* Attempt to render tables if keys contain table data */}
                                <div style={{ lineHeight: '1.6' }}>
                                    {Object.entries(result.data).map(([k, v]) => (
                                        <div key={k} style={{ marginBottom: '10px' }}>
                                            <strong style={{ color: 'var(--text-secondary)' }}>{k}:</strong> <span style={{ marginLeft: '10px' }}>{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showApiModal && (
                <ApiExampleModal
                    onClose={() => setShowApiModal(false)}
                    templateId={selectedTemplate === 'auto' ? '{template_id}' : selectedTemplate}
                />
            )}
        </div>
    );
}
