import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Code, Copy, Terminal, ChevronRight, Check } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

export default function ApiCall({ theme }) {
    const [templates, setTemplates] = useState([]);
    const [copied, setCopied] = useState(null);

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
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '60px 20px' }}>
            <div style={{ marginBottom: '60px', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '20px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-color)', marginBottom: '20px' }}>
                    <Terminal size={32} />
                </div>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '15px' }}>API 服务调用指南</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '700px', margin: '0 auto' }}>
                    将高精度文档提取能力无缝集成到您的 RPA 机器人、业务系统或自动化工作流中。
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '60px' }}>
                <div className="glass-card" style={{ padding: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Python (Requests)
                        </h3>
                        <button onClick={() => handleCopy(pythonCode, 'python')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-color)' }}>
                            {copied === 'python' ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                    </div>
                    <pre style={{
                        background: 'rgba(0,0,0,0.3)',
                        padding: '20px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        lineHeight: '1.6',
                        overflowX: 'auto',
                        border: '1px solid var(--glass-border)'
                    }}>
                        {pythonCode}
                    </pre>
                </div>

                <div className="glass-card" style={{ padding: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            cURL 命令行
                        </h3>
                        <button onClick={() => handleCopy(curlCode, 'curl')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-color)' }}>
                            {copied === 'curl' ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                    </div>
                    <pre style={{
                        background: 'rgba(0,0,0,0.3)',
                        padding: '20px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        lineHeight: '1.6',
                        overflowX: 'auto',
                        border: '1px solid var(--glass-border)'
                    }}>
                        {curlCode}
                    </pre>

                    <div style={{ marginTop: '30px', padding: '20px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', borderLeft: '4px solid var(--primary-color)' }}>
                        <h4 style={{ fontWeight: 'bold', marginBottom: '10px' }}>⚡️ 快速集成建议</h4>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                            在 RPA 环境中，优先使用 <b>HTTP 请求组件</b> 调用此接口。对于 <b>自动匹配模式</b>，
                            请调用 <code>/analyze</code> 端点，系统将自动识别文档类型并返回对应模板提取的数据。
                        </p>
                    </div>
                </div>
            </div>

            <div className="glass-card" style={{ padding: '40px' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '20px' }}>可用模板 ID 列表</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
                    在 API 调用中使用以下 ID 来指定特定的提取规则。
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {templates.map(t => (
                        <div key={t.id} style={{
                            padding: '20px',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '12px',
                            border: '1px solid var(--glass-border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                        }}>
                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{t.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '8px' }}>
                                <code style={{ fontSize: '12px', color: 'var(--primary-color)' }}>{t.id}</code>
                                <button onClick={() => handleCopy(t.id, t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }}>
                                    {copied === t.id ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                            </div>
                        </div>
                    ))}
                    {templates.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>未查询到已保存的模板。</p>}
                </div>
            </div>
        </div>
    );
}
