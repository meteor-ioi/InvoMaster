import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { Code, Copy, Terminal, ChevronDown, ChevronUp, Check, ChevronLeft, ChevronRight, Search, Layout, Server, Sparkles, Clock, Trash2, CheckCircle, XCircle, RefreshCw, FileJson, Download, Eye, Upload, Package, User, Filter } from 'lucide-react';
import { API_BASE } from '../config';

export default function ApiCall({ theme, device, headerCollapsed = false }) {
    const [templates, setTemplates] = useState([]);
    const [copied, setCopied] = useState(null);
    const [selectedLanguage, setSelectedLanguage] = useState('python');
    const [selectedTemplateId, setSelectedTemplateId] = useState('auto');
    const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
    const [isHoveringToggle, setIsHoveringToggle] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // 移除：可用模板 ID 卡片折叠状态（在标签页结构中不再需要）
    // const [isTemplatesCollapsed, setIsTemplatesCollapsed] = useState(false);

    // 新增：API 调用记录相关状态
    const [apiCallRecords, setApiCallRecords] = useState([]);
    const [selectedRecords, setSelectedRecords] = useState(new Set());
    const [selectedRecordId, setSelectedRecordId] = useState(null);
    const [rightPanelMode, setRightPanelMode] = useState('code'); // 'code' | 'preview'
    const [activeTab, setActiveTab] = useState('templates'); // 'templates' | 'history'
    const fileInputRef = useRef(null);

    // --- Filter States ---
    const [filterStatus, setFilterStatus] = useState('all');     // 'all' | 'completed' | 'failed' | 'processing'
    const [filterSearch, setFilterSearch] = useState('');        // 搜索关键词
    const [filterTemplate, setFilterTemplate] = useState('all'); // 'all' | templateId
    const [filterDateRange, setFilterDateRange] = useState('all'); // 'all' | 'today' | 'week' | 'month'
    const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false); // 高级筛选展开状态

    // 测试 API 上传
    const handleTestUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('template_id', selectedTemplateId);

        try {
            await axios.post(`${API_BASE}/api/tasks`, formData);
            fetchTasks(); // Refresh immediately
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err) {
            console.error("Upload failed", err);
            alert("上传失败");
        }
    };

    const fetchTasks = async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/tasks`);
            // Map backend fields to frontend expectation
            const mappedRecords = res.data.map(t => ({
                id: t.id,
                filename: t.filename,
                templateId: t.template_id,
                templateName: t.template_name,
                status: t.status,
                timestamp: t.created_at,
                result: t.result,
                error: t.error
            }));
            setApiCallRecords(mappedRecords);
        } catch (err) {
            console.error("Failed to fetch tasks", err);
        }
    };

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
        fetchTasks();

        // 轮询任务状态 (每 3 秒)
        const intervalId = setInterval(fetchTasks, 3000);

        const handleToggleSidebars = (e) => {
            setIsPanelCollapsed(e.detail.collapsed);
        };

        window.addEventListener('toggle-sidebars', handleToggleSidebars);

        return () => {
            window.removeEventListener('toggle-sidebars', handleToggleSidebars);
            clearInterval(intervalId);
        };
    }, []);

    const handleCopy = (text, type) => {
        navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleDownload = (data, filename) => {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename.split('.')[0] + '_result.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // 切换记录选择状态
    const toggleRecordSelection = (recordId, e) => {
        e.stopPropagation();
        const newSelected = new Set(selectedRecords);
        if (newSelected.has(recordId)) {
            newSelected.delete(recordId);
        } else {
            newSelected.add(recordId);
        }
        setSelectedRecords(newSelected);
    };

    // 全选/取消全选
    const toggleSelectAllRecords = () => {
        if (selectedRecords.size === apiCallRecords.length && apiCallRecords.length > 0) {
            setSelectedRecords(new Set());
        } else {
            setSelectedRecords(new Set(apiCallRecords.map(r => r.id)));
        }
    };

    // 批量删除记录
    const handleBatchDeleteRecords = async () => {
        if (selectedRecords.size === 0) return;
        if (!confirm(`确定要删除这 ${selectedRecords.size} 条调用记录吗?`)) return;

        try {
            await axios.post(`${API_BASE}/api/tasks/batch-delete`, {
                task_ids: Array.from(selectedRecords)
            });

            setApiCallRecords(prev => prev.filter(r => !selectedRecords.has(r.id)));
            if (selectedRecords.has(selectedRecordId)) {
                setSelectedRecordId(null);
                setRightPanelMode('code');
            }
            setSelectedRecords(new Set());
            fetchTasks(); // Refresh to be sure
        } catch (err) {
            console.error("Batch delete failed", err);
            alert("删除失败");
        }
    };

    // --- Filter Helper Functions ---
    const getRecordStatus = (record) => {
        return record.status; // 'completed', 'processing', 'failed'
    };

    const isInDateRange = (timestamp, range) => {
        if (range === 'all') return true;
        const recordDate = new Date(timestamp);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (range) {
            case 'today':
                return recordDate >= today;
            case 'week':
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return recordDate >= weekAgo;
            case 'month':
                const monthAgo = new Date(today);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return recordDate >= monthAgo;
            default:
                return true;
        }
    };

    const matchesKeyword = (record, keyword) => {
        if (!keyword) return true;
        const lowerKeyword = keyword.toLowerCase();
        return (
            record.filename?.toLowerCase().includes(lowerKeyword) ||
            record.template_id?.toLowerCase().includes(lowerKeyword)
        );
    };

    // Filtered API call records
    const filteredRecords = useMemo(() => {
        return apiCallRecords.filter(record => {
            // 1. Status filter
            if (filterStatus !== 'all' && getRecordStatus(record) !== filterStatus) return false;

            // 2. Date range filter
            if (filterDateRange !== 'all' && !isInDateRange(record.created_at, filterDateRange)) return false;

            // 3. Template filter
            if (filterTemplate !== 'all' && record.template_id !== filterTemplate) return false;

            // 4. Keyword search
            if (filterSearch && !matchesKeyword(record, filterSearch)) return false;

            return true;
        });
    }, [apiCallRecords, filterStatus, filterDateRange, filterTemplate, filterSearch]);

    // Count records by status
    const statusCounts = useMemo(() => {
        const counts = { all: apiCallRecords.length, completed: 0, failed: 0, processing: 0 };
        apiCallRecords.forEach(record => {
            const status = getRecordStatus(record);
            counts[status] = (counts[status] || 0) + 1;
        });
        return counts;
    }, [apiCallRecords]);

    // 删除单条记录
    const handleDeleteRecord = async (recordId, e) => {
        e.stopPropagation();

        try {
            await axios.delete(`${API_BASE}/api/tasks/${recordId}`);

            setApiCallRecords(prev => prev.filter(r => r.id !== recordId));
            if (selectedRecordId === recordId) {
                setSelectedRecordId(null);
                setRightPanelMode('code');
            }
            const newSelected = new Set(selectedRecords);
            newSelected.delete(recordId);
            setSelectedRecords(newSelected);
        } catch (err) {
            console.error("Delete failed", err);
            alert("删除失败");
        }
    };

    // 查看记录详情
    const handleViewRecord = (record) => {
        if (record.status !== 'completed') return; // 只有已完成的记录可以预览
        setSelectedRecordId(record.id);
        setRightPanelMode('preview');
    };

    // 获取当前选中的记录
    const getSelectedRecord = () => {
        return apiCallRecords.find(r => r.id === selectedRecordId);
    };

    // 获取状态图标
    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending':
                return <Clock size={12} color="var(--text-secondary)" style={{ opacity: 0.5 }} />;
            case 'processing':
                return <RefreshCw size={12} className="animate-spin" color="var(--primary-color)" />;
            case 'completed':
                return <CheckCircle size={12} color="var(--success-color)" />;
            case 'failed':
                return <XCircle size={12} color="#ef4444" />;
            default:
                return <Clock size={12} color="var(--text-secondary)" />;
        }
    };

    // 获取状态文本
    const getStatusText = (status) => {
        switch (status) {
            case 'pending': return '待处理';
            case 'processing': return '处理中...';
            case 'completed': return '已完成';
            case 'failed': return '失败';
            default: return '未知';
        }
    };

    const actualApiBase = API_BASE || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8291');

    const pythonCode = `import requests

# 1. 准备参数
url = "${actualApiBase}/extract"
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

// 构建接口地址
const baseUrl = "${actualApiBase}";
const url = new URL("/extract", baseUrl);
url.searchParams.append('template_id', '${selectedTemplateId}');
url.searchParams.append('device', '${device || 'auto'}');

fetch(url, {
    method: 'POST',
    body: formData
})
.then(response => response.json())
.then(result => {
    if (result.status === "success") {
        console.log("提取结果:", result.data);
    } else {
        console.error("执行失败:", result.detail || result.message);
    }
})
.catch(error => {
    console.error("网络错误:", error);
});`;

    const curlCode = `curl -X POST "${actualApiBase}/extract?template_id=${selectedTemplateId}&device=${device || 'auto'}" \\
  -F "file=@/path/to/document.pdf"`;

    const getCodeSnippet = (lang) => {
        switch (lang) {
            case 'python': return pythonCode;
            case 'javascript': return jsCode;
            case 'curl': return curlCode;
            default: return pythonCode;
        }
    };

    const filteredTemplates = templates.filter(t => {
        const matchSearch = !searchQuery ||
            t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.id.toLowerCase().includes(searchQuery.toLowerCase());
        return matchSearch;
    });

    // 渲染数据预览面板
    const renderPreviewPanel = () => {
        const record = getSelectedRecord();
        if (!record || !record.result) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.4, gap: '15px' }}>
                    <Eye size={48} />
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>选择一条已完成的记录查看数据</span>
                    <span style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>Inspired by babeldoc, vibe coded by icychick.</span>
                </div>
            );
        }

        return (
            <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }} className="custom-scrollbar">
                <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>{record.filename}</h3>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {record.templateName} · {new Date(record.timestamp).toLocaleString('zh-CN')}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => handleCopy(JSON.stringify(record.result.data, null, 2), 'preview-json')}
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
                                color: 'var(--text-primary)'
                            }}
                        >
                            {copied === 'preview-json' ? <><Check size={12} /> 已复制</> : <><Copy size={12} /> 复制</>}
                        </button>
                        <button
                            onClick={() => handleDownload(record.result.data, record.filename)}
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
                                color: 'var(--text-primary)'
                            }}
                        >
                            <Download size={12} /> 下载
                        </button>
                    </div>
                </div>

                {/* MODIFIED: Show specific feedback if no data matched */}
                {(Object.keys(record.result.data || {}).length === 0 &&
                    (record.result.message === '未匹配到模板' || record.templateName === '未匹配到模板')) && (
                        <div style={{
                            padding: '16px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '20px'
                        }}>
                            <AlertCircle size={20} color="#ef4444" />
                            <span style={{ color: '#ef4444', fontSize: '13px', fontWeight: 'bold' }}>未匹配到模板</span>
                        </div>
                    )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {Object.entries(record.result.data).map(([key, item]) => (
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
                                background: 'rgba(255,255,255,0.03)',
                                padding: '10px',
                                borderRadius: '6px',
                                lineHeight: '1.5'
                            }}>
                                {item.type === 'table' && Array.isArray(item.content) ? (
                                    <div style={{ overflowX: 'auto', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                                            <tbody>
                                                {item.content.map((row, rowIndex) => (
                                                    <tr key={rowIndex} style={{ borderBottom: rowIndex === item.content.length - 1 ? 'none' : '1px solid var(--glass-border)', background: rowIndex % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                                                        {Array.isArray(row) ? row.map((cell, cellIndex) => (
                                                            <td key={cellIndex} style={{
                                                                padding: '8px 12px',
                                                                borderRight: cellIndex === row.length - 1 ? 'none' : '1px solid var(--glass-border)',
                                                                color: 'var(--text-secondary)',
                                                                whiteSpace: 'pre-wrap',
                                                                minWidth: '50px'
                                                            }}>
                                                                {typeof cell === 'object' && cell !== null ? JSON.stringify(cell) : cell}
                                                            </td>
                                                        )) : <td style={{ padding: '8px' }}>{JSON.stringify(row)}</td>}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : Array.isArray(item.content) ? (
                                    <pre style={{ margin: 0, fontSize: '11px', overflow: 'auto', fontFamily: 'monospace' }}>
                                        {JSON.stringify(item.content, null, 2)}
                                    </pre>
                                ) : (
                                    <span style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{item.content}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
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
                {/* Left Sidebar - Template List & API Call Records */}
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
                            right: '-20px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 100,
                            cursor: 'pointer',
                            opacity: isHoveringToggle ? 0.7 : 0.5,
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
                                color: 'var(--primary-color)'
                            }}>
                                <Server size={22} />
                            </div>

                            <div
                                title="可用模板"
                                onClick={() => setActiveTab('templates')}
                                style={{
                                    width: '44px',
                                    height: '44px',
                                    border: 'none',
                                    background: 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: activeTab === 'templates' ? 'var(--primary-color)' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <Package size={22} />
                            </div>

                            <div
                                title={`调用记录: ${apiCallRecords.length}`}
                                onClick={() => setActiveTab('history')}
                                style={{
                                    width: '44px',
                                    height: '44px',
                                    border: 'none',
                                    background: 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: activeTab === 'history' ? 'var(--accent-color)' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <Clock size={20} />
                            </div>
                        </div>
                    ) : (
                        <>
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
                                        onClick={() => setActiveTab('templates')}
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
                                            fontWeight: activeTab === 'templates' ? 'bold' : 'normal',
                                            color: activeTab === 'templates' ? 'var(--primary-color)' : 'var(--text-secondary)',
                                            borderBottom: activeTab === 'templates' ? '2px solid var(--primary-color)' : '2px solid transparent',
                                            transition: 'all 0.3s ease',
                                            position: 'relative'
                                        }}
                                        className="tab-button"
                                    >
                                        <Package size={14} />
                                        可用模板
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
                                        调用记录
                                        {apiCallRecords.length > 0 && (
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
                                                {apiCallRecords.length}
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
                                    {/* Templates Tab */}
                                    {activeTab === 'templates' && (
                                        <div style={{
                                            flex: 1,
                                            padding: '15px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '15px',
                                            animation: 'fadeIn 0.3s ease',
                                            overflow: 'hidden'
                                        }}>
                                            <div>
                                                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                                                    搜索模板
                                                </label>
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
                                            </div>

                                            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                                                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                                                    模板列表
                                                </label>
                                                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }} className="custom-scrollbar">
                                                    {/* Special "Auto" option */}
                                                    <div
                                                        onClick={() => setSelectedTemplateId('auto')}
                                                        style={{
                                                            padding: '10px',
                                                            height: '57px',
                                                            background: selectedTemplateId === 'auto' ? 'rgba(59, 130, 246, 0.1)' : 'var(--input-bg)',
                                                            borderRadius: '10px',
                                                            border: `1px solid ${selectedTemplateId === 'auto' ? 'var(--primary-color)' : 'var(--glass-border)'}`,
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            justifyContent: 'center',
                                                            gap: '4px',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease'
                                                        }} className="list-item-hover">
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                                                <Sparkles size={14} color="var(--primary-color)" />
                                                                <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>自动识别匹配 (推荐)</div>
                                                            </div>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleCopy('auto', 'auto'); }}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', color: copied === 'auto' ? 'var(--success-color)' : 'var(--text-secondary)' }}
                                                                title="复制 auto ID"
                                                            >
                                                                {copied === 'auto' ? <Check size={12} /> : <Copy size={13} />}
                                                            </button>
                                                        </div>
                                                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.7, fontFamily: 'monospace' }}>
                                                            auto
                                                        </div>
                                                    </div>

                                                    {filteredTemplates.length === 0 ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5, gap: '10px' }}>
                                                            <Package size={24} />
                                                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                                                未找到匹配模板
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        filteredTemplates.map(t => (
                                                            <div key={t.id}
                                                                onClick={() => setSelectedTemplateId(t.id)}
                                                                style={{
                                                                    padding: '10px',
                                                                    height: '57px',
                                                                    minHeight: '57px',
                                                                    background: selectedTemplateId === t.id ? 'rgba(59, 130, 246, 0.1)' : 'var(--input-bg)',
                                                                    borderRadius: '10px',
                                                                    border: `1px solid ${selectedTemplateId === t.id ? 'var(--primary-color)' : 'var(--glass-border)'}`,
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    justifyContent: 'center',
                                                                    gap: '4px',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s ease'
                                                                }} className="list-item-hover">
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleCopy(t.id, t.id); }}
                                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', color: copied === t.id ? 'var(--success-color)' : 'var(--text-secondary)' }}
                                                                        title="复制完整ID"
                                                                    >
                                                                        {copied === t.id ? <Check size={12} /> : <Copy size={13} />}
                                                                    </button>
                                                                </div>
                                                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.7, fontFamily: 'monospace' }}>
                                                                    {t.id.substring(0, 24)}{t.id.length > 24 ? '...' : ''}
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* History Tab */}
                                    {activeTab === 'history' && (
                                        <div style={{
                                            flex: 1,
                                            padding: '15px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '12px',
                                            animation: 'fadeIn 0.3s ease',
                                            overflow: 'hidden'
                                        }}>
                                            {/* Search Box */}
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--input-bg)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                                    <Search size={14} color="var(--text-secondary)" />
                                                    <input
                                                        type="text"
                                                        placeholder="搜索文件名/模板ID..."
                                                        value={filterSearch}
                                                        onChange={(e) => setFilterSearch(e.target.value)}
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
                                            </div>

                                            {/* Status Filter Buttons */}
                                            <div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', paddingLeft: '2px' }}>状态</div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                                                    <button
                                                        onClick={() => setFilterStatus('all')}
                                                        style={{
                                                            padding: '8px 10px',
                                                            borderRadius: '8px',
                                                            fontSize: '11px',
                                                            fontWeight: filterStatus === 'all' ? 'bold' : 'normal',
                                                            border: `1px solid ${filterStatus === 'all' ? 'var(--primary-color)' : 'var(--glass-border)'}`,
                                                            background: filterStatus === 'all' ? 'rgba(59, 130, 246, 0.1)' : 'var(--input-bg)',
                                                            color: filterStatus === 'all' ? 'var(--primary-color)' : 'var(--text-secondary)',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px'
                                                        }}
                                                    >
                                                        <Package size={12} />
                                                        全部 {statusCounts.all > 0 && <span style={{ fontSize: '10px', padding: '0px 4px', borderRadius: '8px', background: 'var(--primary-color)', color: 'white' }}>{statusCounts.all}</span>}
                                                    </button>
                                                    <button
                                                        onClick={() => setFilterStatus('completed')}
                                                        style={{
                                                            padding: '8px 10px',
                                                            borderRadius: '8px',
                                                            fontSize: '11px',
                                                            fontWeight: filterStatus === 'completed' ? 'bold' : 'normal',
                                                            border: `1px solid ${filterStatus === 'completed' ? 'var(--success-color)' : 'var(--glass-border)'}`,
                                                            background: filterStatus === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'var(--input-bg)',
                                                            color: filterStatus === 'completed' ? 'var(--success-color)' : 'var(--text-secondary)',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px'
                                                        }}
                                                    >
                                                        <CheckCircle size={12} />
                                                        已完成 {statusCounts.completed > 0 && <span style={{ fontSize: '10px', padding: '0px 4px', borderRadius: '8px', background: 'var(--success-color)', color: 'white' }}>{statusCounts.completed}</span>}
                                                    </button>
                                                    <button
                                                        onClick={() => setFilterStatus('processing')}
                                                        style={{
                                                            padding: '8px 10px',
                                                            borderRadius: '8px',
                                                            fontSize: '11px',
                                                            fontWeight: filterStatus === 'processing' ? 'bold' : 'normal',
                                                            border: `1px solid ${filterStatus === 'processing' ? 'var(--primary-color)' : 'var(--glass-border)'}`,
                                                            background: filterStatus === 'processing' ? 'rgba(59, 130, 246, 0.1)' : 'var(--input-bg)',
                                                            color: filterStatus === 'processing' ? 'var(--primary-color)' : 'var(--text-secondary)',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px'
                                                        }}
                                                    >
                                                        <RefreshCw size={12} className={statusCounts.processing > 0 ? 'animate-spin' : ''} />
                                                        处理中 {statusCounts.processing > 0 && <span style={{ fontSize: '10px', padding: '0px 4px', borderRadius: '8px', background: 'var(--primary-color)', color: 'white' }}>{statusCounts.processing}</span>}
                                                    </button>
                                                    <button
                                                        onClick={() => setFilterStatus('failed')}
                                                        style={{
                                                            padding: '8px 10px',
                                                            borderRadius: '8px',
                                                            fontSize: '11px',
                                                            fontWeight: filterStatus === 'failed' ? 'bold' : 'normal',
                                                            border: `1px solid ${filterStatus === 'failed' ? '#ef4444' : 'var(--glass-border)'}`,
                                                            background: filterStatus === 'failed' ? 'rgba(239, 68, 68, 0.1)' : 'var(--input-bg)',
                                                            color: filterStatus === 'failed' ? '#ef4444' : 'var(--text-secondary)',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px'
                                                        }}
                                                    >
                                                        <XCircle size={12} />
                                                        失败 {statusCounts.failed > 0 && <span style={{ fontSize: '10px', padding: '0px 4px', borderRadius: '8px', background: '#ef4444', color: 'white' }}>{statusCounts.failed}</span>}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Advanced Filters (Collapsible) */}
                                            <div>
                                                <div
                                                    onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        cursor: 'pointer',
                                                        padding: '6px 2px',
                                                        fontSize: '11px',
                                                        color: 'var(--text-secondary)',
                                                        userSelect: 'none'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Filter size={12} />
                                                        更多筛选
                                                    </div>
                                                    {isAdvancedFilterOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                </div>
                                                <div style={{
                                                    maxHeight: isAdvancedFilterOpen ? '500px' : '0',
                                                    opacity: isAdvancedFilterOpen ? 1 : 0,
                                                    overflow: 'hidden',
                                                    transition: 'max-height 0.3s ease, opacity 0.2s ease',
                                                    marginTop: isAdvancedFilterOpen ? '8px' : '0'
                                                }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '10px',
                                                        padding: '10px',
                                                        background: 'rgba(255,255,255,0.02)',
                                                        borderRadius: '8px',
                                                        border: '1px solid var(--glass-border)'
                                                    }}>
                                                        {/* Date Range Filter */}
                                                        <div>
                                                            <label style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                                                                时间范围
                                                            </label>
                                                            <select
                                                                value={filterDateRange}
                                                                onChange={(e) => setFilterDateRange(e.target.value)}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '6px 8px',
                                                                    borderRadius: '6px',
                                                                    fontSize: '11px',
                                                                    background: 'var(--input-bg)',
                                                                    border: '1px solid var(--glass-border)',
                                                                    color: 'var(--text-primary)',
                                                                    outline: 'none'
                                                                }}
                                                            >
                                                                <option value="all">全部时间</option>
                                                                <option value="today">今天</option>
                                                                <option value="week">近7天</option>
                                                                <option value="month">近30天</option>
                                                            </select>
                                                        </div>

                                                        {/* Template Filter */}
                                                        <div>
                                                            <label style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                                                                指定模板
                                                            </label>
                                                            <select
                                                                value={filterTemplate}
                                                                onChange={(e) => setFilterTemplate(e.target.value)}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '6px 8px',
                                                                    borderRadius: '6px',
                                                                    fontSize: '11px',
                                                                    background: 'var(--input-bg)',
                                                                    border: '1px solid var(--glass-border)',
                                                                    color: 'var(--text-primary)',
                                                                    outline: 'none'
                                                                }}
                                                            >
                                                                <option value="all">全部模板</option>
                                                                <option value="auto">自动识别</option>
                                                                {templates.map(t => (
                                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Result Count and Actions */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '5px' }}>
                                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                    共 {filteredRecords.length} 条记录
                                                </span>
                                                {apiCallRecords.length > 0 && selectedRecords.size > 0 && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <button
                                                            onClick={handleBatchDeleteRecords}
                                                            style={{
                                                                background: 'rgba(239, 68, 68, 0.1)',
                                                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                                                color: '#ef4444',
                                                                fontSize: '10px',
                                                                padding: '2px 8px',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px'
                                                            }}
                                                        >
                                                            <Trash2 size={10} /> 删除({selectedRecords.size})
                                                        </button>
                                                        <div
                                                            onClick={toggleSelectAllRecords}
                                                            style={{
                                                                width: '14px',
                                                                height: '14px',
                                                                borderRadius: '3px',
                                                                border: '1px solid var(--glass-border)',
                                                                background: selectedRecords.size === apiCallRecords.length && apiCallRecords.length > 0 ? 'var(--primary-color)' : 'transparent',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer'
                                                            }}
                                                            title="全选/取消全选"
                                                        >
                                                            {selectedRecords.size === apiCallRecords.length && apiCallRecords.length > 0 && <Check size={10} color="white" />}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }} className="custom-scrollbar">
                                                {filteredRecords.length === 0 ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5, gap: '10px' }}>
                                                        <Clock size={24} />
                                                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                                            {filterStatus !== 'all' || filterSearch || filterTemplate !== 'all' || filterDateRange !== 'all'
                                                                ? '未找到匹配的记录'
                                                                : '暂无调用记录'}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    filteredRecords.map((record) => (
                                                        <div
                                                            key={record.id}
                                                            onClick={() => handleViewRecord(record)}
                                                            style={{
                                                                padding: '10px',
                                                                borderRadius: '10px',
                                                                background: selectedRecordId === record.id ? 'rgba(59, 130, 246, 0.1)' : (record.status === 'processing' ? 'rgba(59, 130, 246, 0.05)' : 'var(--input-bg)'),
                                                                border: selectedRecords.has(record.id) ? '1px solid var(--primary-color)' : (record.status === 'processing' ? '1px solid var(--primary-color)' : '1px solid var(--glass-border)'),
                                                                cursor: record.status === 'completed' ? 'pointer' : 'default',
                                                                opacity: record.status === 'completed' || record.status === 'failed' ? 1 : 0.8,
                                                                transition: 'all 0.2s',
                                                                display: 'flex',
                                                                gap: '8px',
                                                                alignItems: 'flex-start'
                                                            }}
                                                            className={record.status === 'completed' ? 'list-item-hover' : ''}
                                                        >
                                                            <div
                                                                onClick={(e) => toggleRecordSelection(record.id, e)}
                                                                style={{
                                                                    marginTop: '2px',
                                                                    width: '14px',
                                                                    minWidth: '14px',
                                                                    height: '14px',
                                                                    borderRadius: '3px',
                                                                    border: '1px solid var(--glass-border)',
                                                                    background: selectedRecords.has(record.id) ? 'var(--primary-color)' : 'transparent',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                {selectedRecords.has(record.id) && <Check size={10} color="white" />}
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                                                        {record.filename}
                                                                    </span>
                                                                    {getStatusIcon(record.status)}
                                                                </div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                                                                        {record.templateName}
                                                                    </span>
                                                                    <span style={{ fontSize: '9px', opacity: 0.5 }}>
                                                                        {new Date(record.timestamp).toLocaleString('zh-CN', {
                                                                            year: 'numeric', month: '2-digit', day: '2-digit',
                                                                            hour: '2-digit', minute: '2-digit', second: '2-digit',
                                                                            hour12: false
                                                                        }).replace(/\//g, '-')}
                                                                    </span>
                                                                </div>
                                                                {record.status === 'failed' && record.error && (
                                                                    <div style={{ fontSize: '9px', color: '#ef4444', marginTop: '4px', opacity: 0.8 }}>
                                                                        {record.error.substring(0, 50)}...
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )
                    }
                </aside>

                {/* Right Panel - Code Preview or Data Preview */}
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
                            {/* Panel Mode Tabs */}
                            <div style={{ display: 'flex', gap: '4px', background: 'var(--input-bg)', padding: '3px', borderRadius: '8px' }}>
                                <button
                                    onClick={() => { setRightPanelMode('code'); setSelectedRecordId(null); }}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        fontSize: '11px',
                                        cursor: 'pointer',
                                        background: rightPanelMode === 'code' ? 'var(--primary-color)' : 'transparent',
                                        color: rightPanelMode === 'code' ? '#fff' : 'var(--text-secondary)',
                                        fontWeight: rightPanelMode === 'code' ? 'bold' : 'normal',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <Terminal size={12} /> 代码示例
                                </button>
                                <button
                                    onClick={() => setRightPanelMode('preview')}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        fontSize: '11px',
                                        cursor: 'pointer',
                                        background: rightPanelMode === 'preview' ? 'var(--accent-color)' : 'transparent',
                                        color: rightPanelMode === 'preview' ? '#fff' : 'var(--text-secondary)',
                                        fontWeight: rightPanelMode === 'preview' ? 'bold' : 'normal',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <FileJson size={12} /> 数据预览
                                </button>
                            </div>
                        </div>

                        {rightPanelMode === 'code' && (
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
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: 'var(--primary-color)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#fff',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        padding: '0 12px',
                                        height: '28px',
                                        borderRadius: '6px',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {copied === 'code' ? <><Check size={14} /> 已复制</> : <><Copy size={14} /> 复制代码</>}
                                </button>
                                <button
                                    onClick={() => {
                                        setActiveTab('history');
                                        fileInputRef.current?.click();
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: 'var(--accent-color)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#fff',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        padding: '0 12px',
                                        height: '28px',
                                        borderRadius: '6px',
                                        transition: 'all 0.2s',
                                        opacity: 0.9
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.9'}
                                >
                                    <Upload size={14} /> Test API
                                </button>
                            </div>
                        )}
                        {rightPanelMode === 'preview' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {/* 移除了 Test API 按钮 */}
                            </div>
                        )}
                    </div>

                    {rightPanelMode === 'code' ? (
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
                    ) : (
                        <div style={{ flex: 1, overflow: 'hidden', background: 'var(--card-bg)' }}>
                            {renderPreviewPanel()}
                        </div>
                    )}
                </div>
            </div>
            {/* Hidden elements */}
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleTestUpload}
            />
        </div>
    );
}
