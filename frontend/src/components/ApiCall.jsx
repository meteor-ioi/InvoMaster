import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Code, Copy, Terminal, ChevronDown, Check } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

export default function ApiCall({ theme }) {
    const [templates, setTemplates] = useState([]);
    const [copied, setCopied] = useState(null);
    const [selectedLanguage, setSelectedLanguage] = useState('python');

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const res = await axios.get(`${API_BASE}/templates`);
                setTemplates(res.data);
            } catch (err) {
                console.error("Failed to fetch templates", err);
            }
        };
        fetchTemplates();
    }, []);

    const handleCopy = (text, type) => {
        navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    const pythonCode = `import requests

# 1. 准备参数
url = "${API_BASE}/extract"
params = {
    "template_id": "YOUR_TEMPLATE_ID" # 替换为实际模板 ID
}

# 2. 上传文件进行提取
files = {
    "file": open("fapiao.pdf", "rb")
}

response = requests.post(url, params=params, files=files)

# 3. 处理解析结果
if response.status_code == 200:
    result = response.json()
    print("提取成功:", result['data'])
else:
    print("错误信息:", response.text)`;

    const curlCode = `curl -X POST "${API_BASE}/extract?template_id=YOUR_TEMPLATE_ID" \\
  -F "file=@/path/to/invoice.pdf"`;

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 20px 40px' }}>
            {/* Combined Code Card - Directly at top */}
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden', marginBottom: '30px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
                <div style={{
                    padding: '15px 25px',
                    borderBottom: '1px solid var(--glass-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.02)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ position: 'relative' }}>
                            <select
                                value={selectedLanguage}
                                onChange={(e) => setSelectedLanguage(e.target.value)}
                                style={{
                                    appearance: 'none',
                                    padding: '6px 30px 6px 15px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--glass-border)',
                                    background: 'var(--input-bg)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    minWidth: '120px',
                                    outline: 'none'
                                }}
                            >
                                <option value="python">Python</option>
                                <option value="curl">cURL</option>
                            </select>
                            <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }} />
                        </div>
                    </div>
                    <button
                        onClick={() => handleCopy(selectedLanguage === 'python' ? pythonCode : curlCode, 'code')}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-color)', fontSize: '14px', fontWeight: 'bold' }}
                    >
                        {copied === 'code' ? <><Check size={16} /> 已拷贝</> : <><Copy size={16} /> 复制代码</>}
                    </button>
                </div>
                <div style={{ padding: '25px', background: '#00000040' }}>
                    <pre style={{
                        margin: 0,
                        fontSize: '14px',
                        lineHeight: '1.7',
                        overflowX: 'auto',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                        color: '#e2e8f0'
                    }}>
                        {selectedLanguage === 'python' ? pythonCode : curlCode}
                    </pre>
                </div>
            </div>

            {/* Template IDs - Simplified Layout */}
            <div className="glass-card" style={{ padding: '30px' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Terminal size={20} className="text-primary" />
                    可用模板 ID
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '15px' }}>
                    {templates.map(t => (
                        <div key={t.id} style={{
                            padding: '15px',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: '12px',
                            border: '1px solid var(--glass-border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                        }}>
                            <div style={{ fontSize: '0.95rem', fontWeight: '600', opacity: 0.9 }}>{t.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <code style={{ fontSize: '12px', color: 'var(--primary-color)', opacity: 0.8 }}>{t.id}</code>
                                <button onClick={() => handleCopy(t.id, t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}>
                                    {copied === t.id ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                            </div>
                        </div>
                    ))}
                    {templates.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>未查询到已保存的模板。</p>}
                </div>
            </div>
        </div>
    );
}
