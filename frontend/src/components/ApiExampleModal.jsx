import React from 'react';
import { X, Copy } from 'lucide-react';

export default function ApiExampleModal({ onClose, templateId }) {
    const pythonCode = `import requests

url = "http://localhost:8000/extract"
params = {
    "template_id": "${templateId}"
}
files = {
    "file": open("invoice.pdf", "rb")
}

response = requests.post(url, params=params, files=files)
print(response.json())
`;

    const curlCode = `curl -X POST "http://localhost:8000/extract?template_id=${templateId}" \\
  -F "file=@/path/to/invoice.pdf"`;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000
        }} onClick={onClose}>
            <div style={{
                width: '600px', maxWidth: '90vw',
                background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                borderRadius: '16px', padding: '30px',
                position: 'relative'
            }} onClick={e => e.stopPropagation()}>

                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                    <X size={24} />
                </button>

                <h2 style={{ marginBottom: '20px', fontSize: '1.5rem' }}>API 调用示例</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
                    在您的 RPA 流程或业务系统中集成以下代码即可实现自动提取。
                </p>

                <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <label style={{ fontWeight: 'bold' }}>Python (Requests)</label>
                        <Copy size={16} style={{ cursor: 'pointer', opacity: 0.7 }} />
                    </div>
                    <pre style={{
                        background: '#1e1e1e', color: '#d4d4d4',
                        padding: '15px', borderRadius: '8px',
                        overflowX: 'auto', fontFamily: 'monospace', fontSize: '13px'
                    }}>
                        {pythonCode}
                    </pre>
                </div>

                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <label style={{ fontWeight: 'bold' }}>cURL</label>
                        <Copy size={16} style={{ cursor: 'pointer', opacity: 0.7 }} />
                    </div>
                    <pre style={{
                        background: '#1e1e1e', color: '#d4d4d4',
                        padding: '15px', borderRadius: '8px',
                        overflowX: 'auto', fontFamily: 'monospace', fontSize: '13px'
                    }}>
                        {curlCode}
                    </pre>
                </div>

            </div>
        </div>
    );
}
