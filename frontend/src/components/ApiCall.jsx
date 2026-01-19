import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Code, Copy, Terminal, ChevronDown, Check, ChevronLeft, ChevronRight, Search, Layout, Server, Sparkles } from 'lucide-react';
import { API_BASE } from '../config';

export default function ApiCall({ theme, device, headerCollapsed = false }) {
    const [templates, setTemplates] = useState([]);
    const [copied, setCopied] = useState(null);
    const [selectedLanguage, setSelectedLanguage] = useState('python');
    const [selectedTemplateId, setSelectedTemplateId] = useState('auto');
    const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
    const [isHoveringToggle, setIsHoveringToggle] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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

        const handleToggleSidebars = (e) => {
            setIsPanelCollapsed(e.detail.collapsed);
        };

        window.addEventListener('toggle-sidebars', handleToggleSidebars);
        return () => window.removeEventListener('toggle-sidebars', handleToggleSidebars);
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
    "template_id": "${selectedTemplateId}", # 选择自动模式 auto 或输入模板id
    "device": "${device || 'auto'}"        # 可选类型：auto, cpu, cuda, mps
}

# 2. 上传文件进行提取
files = {
    "file": open("document.pdf", "rb")
}

response = requests.post(url, params=params, files=files)

# 3. 处理解析结果
if response.status_code == 200:
    result = response.json()
    print("提取成功:", result["data"])
else:
    print("错误信息:", response.text)`;

    const jsCode = `// 使用 Fetch API 发起请求
const formData = new FormData();
formData.append('file', fileInput.files[0]); // 获取上传的文件对象

const url = new URL("${API_BASE}/extract");
url.searchParams.append('template_id', '${selectedTemplateId}'); // 自动模式：auto 或输入模板id
url.searchParams.append('device', '${device || 'auto'}');      // 可选类型：auto, cpu, cuda, mps

fetch(url, {
    method: 'POST',
    body: formData
})
.then(response => response.json())
.then(result => {
    if (result.status === "success") {
        console.log("提取结果:", result.data);
    } else {
        console.error("执行失败:", result.message);
    }
})
.catch(error => {
    console.error("网络错误:", error);
});`;

    const curlCode = `curl -X POST "${API_BASE}/extract?template_id=${selectedTemplateId}&device=${device || 'auto'}" \\
  -F "file=@/path/to/document.pdf"`;

    const getCodeSnippet = (lang) => {
        switch (lang) {
            case 'python': return pythonCode;
            case 'javascript': return jsCode;
            case 'curl': return curlCode;
            default: return pythonCode;
        }
    };

    const filteredTemplates = templates.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.id.toLowerCase().includes(searchQuery.toLowerCase()));

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
                {/* Left Sidebar - Template List */}
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
                    {/* Toggle Button */}
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
                                background: 'linear-gradient(135deg, #3b82f633, #8b5cf633)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--primary-color)'
                            }}>
                                <Server size={18} />
                            </div>
                            <div style={{ width: '20px', height: '1px', background: 'var(--glass-border)' }} />
                            <div
                                title={`可用模板数: ${templates.length}`}
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    border: '1px solid var(--primary-color)',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--primary-color)',
                                    fontSize: '14px',
                                    fontWeight: 'bold'
                                }}
                            >
                                {templates.length}
                            </div>
                        </div>
                    ) : (
                        <div className="glass-card" style={{ padding: '15px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '15px', flex: 1, overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '5px' }}>
                                <Layout size={16} color="var(--accent-color)" />
                                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>可用模板 ID ({templates.length})</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--input-bg)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                <Search size={12} color="var(--text-secondary)" />
                                <input
                                    type="text"
                                    placeholder="搜索模板名称或ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        outline: 'none',
                                        fontSize: '12px',
                                        color: 'var(--text-primary)',
                                        width: '100%'
                                    }}
                                />
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }} className="custom-scrollbar">
                                {/* Special "Auto" option */}
                                <div
                                    onClick={() => setSelectedTemplateId('auto')}
                                    style={{
                                        padding: '12px',
                                        background: selectedTemplateId === 'auto'
                                            ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15))'
                                            : 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(139, 92, 246, 0.05))',
                                        borderRadius: '10px',
                                        border: `1px solid ${selectedTemplateId === 'auto' ? 'var(--primary-color)' : 'var(--glass-border)'}`,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px',
                                        boxShadow: selectedTemplateId === 'auto' ? '0 4px 12px rgba(59, 130, 246, 0.15)' : 'none',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }} className="list-item-hover">
                                    <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.1 }}>
                                        <Sparkles size={40} />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Sparkles size={14} color="var(--primary-color)" />
                                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--primary-color)' }}>自动识别匹配 (推荐)</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.1)', padding: '4px 6px', borderRadius: '4px' }}>
                                        <code style={{ fontSize: '10px', color: 'var(--primary-color)', fontWeight: 'bold' }}>auto</code>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleCopy('auto', 'auto'); }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', color: copied === 'auto' ? 'var(--success-color)' : 'var(--primary-color)' }}
                                            title="复制 auto ID"
                                        >
                                            {copied === 'auto' ? <Check size={12} /> : <Copy size={12} />}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ height: '1px', background: 'var(--glass-border)', margin: '4px 0' }} />

                                {filteredTemplates.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px', fontSize: '12px' }}>
                                        未找到匹配模板
                                    </div>
                                ) : (
                                    filteredTemplates.map(t => (
                                        <div key={t.id}
                                            onClick={() => setSelectedTemplateId(t.id)}
                                            style={{
                                                padding: '10px',
                                                background: selectedTemplateId === t.id ? 'rgba(59, 130, 246, 0.1)' : 'var(--input-bg)',
                                                borderRadius: '10px',
                                                border: `1px solid ${selectedTemplateId === t.id ? 'var(--primary-color)' : 'var(--glass-border)'}`,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '6px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }} className="list-item-hover">
                                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{t.name}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.05)', padding: '4px 6px', borderRadius: '4px' }}>
                                                <code style={{ fontSize: '10px', color: 'var(--primary-color)', fontFamily: 'monospace' }}>{t.id.substring(0, 18)}...</code>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleCopy(t.id, t.id); }}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', color: copied === t.id ? 'var(--success-color)' : 'var(--text-secondary)' }}
                                                    title="复制完整ID"
                                                >
                                                    {copied === t.id ? <Check size={12} /> : <Copy size={12} />}
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </aside>

                {/* Right Panel - Code Preview */}
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
                                <Terminal size={18} />
                            </div>
                            <span style={{ fontSize: '15px', fontWeight: 'bold' }}>API 调用示例</span>
                        </div>

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
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        minWidth: '100px',
                                        outline: 'none'
                                    }}
                                >
                                    <option value="python">Python</option>
                                    <option value="javascript">JavaScript</option>
                                    <option value="curl">cURL</option>
                                </select>
                                <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }} />
                            </div>
                            <button
                                onClick={() => handleCopy(getCodeSnippet(selectedLanguage), 'code')}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--primary-color)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: '12px', fontWeight: 'bold', padding: '6px 12px', borderRadius: '6px' }}
                            >
                                {copied === 'code' ? <><Check size={14} /> 已复制</> : <><Copy size={14} /> 复制代码</>}
                            </button>
                        </div>
                    </div>

                    <div style={{ flex: 1, padding: '0', background: 'rgba(15, 23, 42, 0.8)', overflow: 'auto' }} className="custom-scrollbar">
                        <div style={{ padding: '25px' }}>
                            <pre style={{
                                margin: 0,
                                fontSize: '14px',
                                lineHeight: '1.7',
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                color: '#e2e8f0'
                            }}>
                                {getCodeSnippet(selectedLanguage)}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
