import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { Code, Copy, Terminal, ChevronDown, ChevronUp, Check, ChevronLeft, ChevronRight, Search, Layout, Server, Sparkles, Clock, Trash2, CheckCircle, XCircle, RefreshCw, FileJson, Download, Eye, Upload, Package, User, Filter, AlertCircle } from 'lucide-react';
import { API_BASE } from '../config';

export default function ApiCall({ theme, device, headerCollapsed = false }) {
    const [templates, setTemplates] = useState([]);
    const [copied, setCopied] = useState(null);
    const [selectedLanguage, setSelectedLanguage] = useState('python');
    const [selectedTemplateId, setSelectedTemplateId] = useState('auto');
    const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
    const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
    const [isHoveringLeftToggle, setIsHoveringLeftToggle] = useState(false);
    const [isHoveringRightToggle, setIsHoveringRightToggle] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // API 调用记录相关状态
    const [apiCallRecords, setApiCallRecords] = useState([]);
    const [selectedRecords, setSelectedRecords] = useState(new Set());
    const [selectedRecordId, setSelectedRecordId] = useState(null);
    const [rightPanelMode, setRightPanelMode] = useState('code'); // 'code' | 'preview'
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
            setLeftPanelCollapsed(e.detail.collapsed);
            setRightPanelCollapsed(e.detail.collapsed);
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

    const handleDownload = async (data, filename) => {
        const json = JSON.stringify(data, null, 2);
        const saveFilename = filename.split('.')[0] + '_result.json';

        // Check if running in pywebview
        if (window.pywebview && window.pywebview.api && window.pywebview.api.save_file) {
            try {
                await window.pywebview.api.save_file(json, saveFilename);
            } catch (err) {
                console.error("Native save failed", err);
                triggerBrowserDownload(json, saveFilename);
            }
        } else {
            triggerBrowserDownload(json, saveFilename);
        }
    };

    const triggerBrowserDownload = (content, filename) => {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
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
            record.templateName?.toLowerCase().includes(lowerKeyword) ||
            record.templateId?.toLowerCase().includes(lowerKeyword)
        );
    };

    // Filtered API call records
    const filteredRecords = useMemo(() => {
        return apiCallRecords.filter(record => {
            // 1. Status filter
            if (filterStatus !== 'all' && getRecordStatus(record) !== filterStatus) return false;

            // 2. Date range filter
            if (filterDateRange !== 'all' && !isInDateRange(record.timestamp, filterDateRange)) return false;

            // 3. Template filter
            if (filterTemplate !== 'all' && record.templateId !== filterTemplate) return false;

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
                return <Clock size={12} color="#fbbf24" />;
            case 'completed':
                return <CheckCircle size={12} color="var(--success-color)" />;
            case 'failed':
                return <AlertCircle size={12} color="#ef4444" />;
            default:
                return <Clock size={12} color="var(--text-secondary)" />;
        }
    };

    // 获取状态文本
    const getStatusText = (status) => {
        switch (status) {
            case 'pending': return '待处理';
            case 'processing': return '排队中'; // 统一为“排队”
            case 'completed': return '成功';    // 统一为“成功”
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
                    <span style={{ fontSize: '10px', marginTop: '4px', opacity: 0.8 }}>Inspired by babeldoc, vibe coded by icychick.</span>
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
                                background: theme === 'light' ? 'transparent' : 'rgba(255,255,255,0.03)',
                                padding: theme === 'light' ? '0' : '10px',
                                borderRadius: '6px',
                                lineHeight: '1.5',
                                border: theme === 'light' ? 'none' : '1px solid rgba(255,255,255,0.05)'
                            }}>
                                {item.type === 'table' && Array.isArray(item.content) ? (
                                    <div style={{ overflowX: 'auto', borderRadius: '6px', border: '1px solid var(--glass-border)', background: theme === 'light' ? 'transparent' : 'rgba(0,0,0,0.1)' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                                            <tbody>
                                                {item.content.map((row, rowIndex) => (
                                                    <tr key={rowIndex} style={{ borderBottom: rowIndex === item.content.length - 1 ? 'none' : '1px solid var(--glass-border)', background: rowIndex % 2 === 0 ? 'transparent' : (theme === 'light' ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.02)') }}>
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
        <div style={{ padding: '0 20px 40px', position: 'relative' }}>
            <main style={{
                display: 'grid',
                gridTemplateColumns: `${leftPanelCollapsed ? '64px' : '300px'} minmax(0, 1fr) ${rightPanelCollapsed ? '64px' : '300px'}`,
                gap: '20px',
                alignItems: 'start',
                marginTop: '20px',
                transition: 'grid-template-columns 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative'
            }}>
                {/* --- Left Panel: Available Templates --- */}
                <aside style={{
                    position: 'sticky',
                    top: '20px',
                    width: leftPanelCollapsed ? '64px' : '300px',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '15px',
                    height: headerCollapsed ? 'calc(100vh - 76px)' : 'calc(100vh - 100px)',
                    overflow: 'visible'
                }}>
                    <div
                        style={{
                            position: 'absolute',
                            right: '-20px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 100,
                            cursor: 'pointer',
                            opacity: isHoveringLeftToggle ? 0.7 : 0.5,
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={() => setIsHoveringLeftToggle(true)}
                        onMouseLeave={() => setIsHoveringLeftToggle(false)}
                        onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
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
                            {leftPanelCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                        </div>
                    </div>

                    {leftPanelCollapsed ? (
                        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '20px 0', borderRadius: '16px' }}>
                            <div style={{ width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)' }}>
                                <Package size={22} />
                            </div>
                            <div style={{ width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)' }}>
                                <Sparkles size={20} />
                            </div>
                        </div>
                    ) : (
                        <div className="glass-card" style={{ flex: 1, padding: '0', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
                            <div style={{ padding: '12px 15px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Package size={16} color="var(--primary-color)" />
                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)' }}>模板调用</span>
                            </div>
                            <div style={{ flex: 1, padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>模板搜索</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'var(--input-bg)', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                                        <Search size={14} color="var(--text-secondary)" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="搜索模板名称或模板 ID..."
                                            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', color: 'var(--text-primary)', width: '100%' }}
                                        />
                                    </div>
                                </div>
                                {/* 自动识别模式 - 固定显示，不随列表滚动 */}
                                <div
                                    onClick={() => { setSelectedTemplateId('auto'); setRightPanelMode('code'); setSelectedRecordId(null); }}
                                    style={{
                                        padding: '10px 12px',
                                        borderRadius: '10px',
                                        background: selectedTemplateId === 'auto' ? 'rgba(59, 130, 246, 0.1)' : 'var(--input-bg)',
                                        border: selectedTemplateId === 'auto' ? '1px solid var(--primary-color)' : '1px solid var(--glass-border)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    className="list-item-hover"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Sparkles size={14} color="var(--accent-color)" />
                                        <span style={{ fontSize: '12px', fontWeight: selectedTemplateId === 'auto' ? 'bold' : 'normal', color: 'var(--text-primary)' }}>自动识别模式</span>
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>auto</div>
                                </div>
                                {/* 模板列表 */}
                                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>模板列表</label>
                                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }} className="custom-scrollbar">
                                    {templates.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.id.toLowerCase().includes(searchQuery.toLowerCase())).map(t => (
                                        <div
                                            key={t.id}
                                            onClick={() => { setSelectedTemplateId(t.id); setRightPanelMode('code'); setSelectedRecordId(null); }}
                                            style={{
                                                padding: '10px 12px',
                                                borderRadius: '10px',
                                                background: selectedTemplateId === t.id ? 'rgba(59, 130, 246, 0.1)' : 'var(--input-bg)',
                                                border: selectedTemplateId === t.id ? '1px solid var(--primary-color)' : '1px solid var(--glass-border)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            className="list-item-hover"
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ fontSize: '12px', fontWeight: selectedTemplateId === t.id ? 'bold' : 'normal', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                                                <button onClick={(e) => { e.stopPropagation(); handleCopy(t.id, t.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied === t.id ? 'var(--success-color)' : 'var(--text-secondary)' }}>
                                                    {copied === t.id ? <Check size={12} /> : <Copy size={12} />}
                                                </button>
                                            </div>
                                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', fontFamily: 'monospace' }}>{t.id.substring(0, 20)}...</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </aside>

                {/* --- Middle Panel: Code / Preview Area --- */}
                <section className="glass-card" style={{
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
                        background: 'rgba(255,255,255,0.03)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        {/* 左侧区域 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '100px' }}>
                            {rightPanelMode === 'code' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', background: 'var(--primary-color)', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}>
                                    <Terminal size={12} /> 代码示例
                                </div>
                            )}
                        </div>

                        {/* 右侧区域 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {rightPanelMode === 'code' ? (
                                <>
                                    <div style={{ position: 'relative' }}>
                                        <select
                                            value={selectedLanguage}
                                            onChange={(e) => setSelectedLanguage(e.target.value)}
                                            style={{
                                                appearance: 'none', padding: '6px 30px 6px 12px', borderRadius: '8px', border: '1px solid var(--glass-border)',
                                                background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', outline: 'none'
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
                                            display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--primary-color)', border: 'none',
                                            cursor: 'pointer', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '0 12px', height: '28px', borderRadius: '6px'
                                        }}
                                    >
                                        {copied === 'code' ? <><Check size={14} /> 已复制</> : <><Copy size={14} /> 复制代码</>}
                                    </button>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--accent-color)', border: 'none',
                                            cursor: 'pointer', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '0 12px', height: '28px', borderRadius: '6px'
                                        }}
                                    >
                                        <Upload size={14} /> 接口测试
                                    </button>
                                </>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', background: 'var(--accent-color)', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}>
                                    <FileJson size={12} /> 数据预览
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {rightPanelMode === 'code' ? (
                            <div style={{ flex: 1, padding: '0', background: 'rgba(15, 23, 42, 0.8)', overflow: 'auto' }} className="custom-scrollbar">
                                <div style={{ padding: '25px' }}>
                                    <pre style={{
                                        margin: 0, fontSize: '14px', lineHeight: '1.7', color: '#e2e8f0',
                                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
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
                </section>

                {/* --- Right Panel: API Call History --- */}
                <aside style={{
                    position: 'sticky',
                    top: '20px',
                    width: rightPanelCollapsed ? '64px' : '300px',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '15px',
                    height: headerCollapsed ? 'calc(100vh - 76px)' : 'calc(100vh - 100px)',
                    overflow: 'visible'
                }}>
                    <div
                        style={{
                            position: 'absolute',
                            left: '-20px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 100,
                            cursor: 'pointer',
                            opacity: isHoveringRightToggle ? 0.7 : 0.5,
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={() => setIsHoveringRightToggle(true)}
                        onMouseLeave={() => setIsHoveringRightToggle(false)}
                        onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
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
                            {rightPanelCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                        </div>
                    </div>

                    {rightPanelCollapsed ? (
                        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '20px 0', borderRadius: '16px' }}>
                            <div style={{ width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)' }}>
                                <Clock size={20} />
                            </div>
                            {statusCounts.all > 0 && (
                                <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    background: 'var(--accent-color)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '11px',
                                    fontWeight: 'bold'
                                }}>
                                    {statusCounts.all}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="glass-card" style={{ flex: 1, padding: '0', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
                            <div style={{ padding: '12px 15px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Clock size={16} color="var(--accent-color)" />
                                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)' }}>调用记录</span>
                                    <span style={{
                                        fontSize: '10px',
                                        background: 'var(--accent-color)',
                                        color: 'white',
                                        padding: '1px 6px',
                                        borderRadius: '10px',
                                        minWidth: '18px',
                                        textAlign: 'center',
                                        fontWeight: 'bold'
                                    }}>
                                        {statusCounts.all}
                                    </span>
                                </div>
                            </div>
                            <div style={{ flex: 1, padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
                                {/* 记录搜索和筛选 */}
                                <div className="filter-section">
                                    <div>
                                        <label className="filter-label">
                                            <span>记录搜索</span>
                                            <button
                                                onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: isAdvancedFilterOpen ? 'var(--primary-color)' : 'var(--text-secondary)',
                                                    fontSize: '10px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <Filter size={10} />
                                                高级筛选
                                                <div style={{ transform: isAdvancedFilterOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s ease' }}>
                                                    <ChevronDown size={10} />
                                                </div>
                                            </button>
                                        </label>
                                        <div className="search-input-wrapper">
                                            <Search size={14} color="var(--text-secondary)" />
                                            <input
                                                type="text"
                                                value={filterSearch}
                                                onChange={(e) => setFilterSearch(e.target.value)}
                                                placeholder="搜索文件名/模板名..."
                                                className="search-input"
                                            />
                                        </div>
                                    </div>

                                    {/* 高级筛选面板 - 使用 CSS 类控制垂直展开 */}
                                    <div className={`expand-vertical ${isAdvancedFilterOpen ? 'expanded' : ''}`} style={{
                                        padding: isAdvancedFilterOpen ? '12px' : '0 12px',
                                        marginBottom: isAdvancedFilterOpen ? '10px' : '0',
                                        background: 'rgba(255,255,255,0.02)',
                                        borderRadius: '10px',
                                        border: `1px solid ${isAdvancedFilterOpen ? 'var(--glass-border)' : 'transparent'}`,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: isAdvancedFilterOpen ? '10px' : '0',
                                        pointerEvents: isAdvancedFilterOpen ? 'all' : 'none'
                                    }}>
                                        <div>
                                            <label className="filter-label-small">日期范围</label>
                                            <select
                                                value={filterDateRange}
                                                onChange={(e) => setFilterDateRange(e.target.value)}
                                                className="filter-select"
                                            >
                                                <option value="all">全部时间</option>
                                                <option value="today">今天</option>
                                                <option value="week">本周</option>
                                                <option value="month">本月</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="filter-label-small">引用模板</label>
                                            <select
                                                value={filterTemplate}
                                                onChange={(e) => setFilterTemplate(e.target.value)}
                                                className="filter-select"
                                            >
                                                <option value="all">全部模板</option>
                                                {templates.map(t => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* 状态筛选 */}
                                    <div className="status-filter-grid">
                                        {[
                                            { id: 'all', label: '全部', icon: <Package size={10} />, activeColor: 'var(--primary-color)', activeBg: 'rgba(59, 130, 246, 0.1)' },
                                            { id: 'completed', label: '成功', icon: <CheckCircle size={10} />, activeColor: 'var(--success-color)', activeBg: 'rgba(16, 185, 129, 0.1)' },
                                            { id: 'processing', label: '排队', icon: <Clock size={10} />, activeColor: '#fbbf24', activeBg: 'rgba(251, 191, 36, 0.1)' },
                                            { id: 'failed', label: '失败', icon: <AlertCircle size={10} />, activeColor: '#ef4444', activeBg: 'rgba(239, 68, 68, 0.1)' }
                                        ].map(btn => (
                                            <button
                                                key={btn.id}
                                                onClick={() => setFilterStatus(btn.id)}
                                                className={`status-filter-btn ${filterStatus === btn.id ? 'active' : ''} ${filterStatus === btn.id && btn.id !== 'all' ? `active-${btn.id}` : ''}`}
                                            >
                                                {btn.icon} {btn.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 记录列表 */}
                                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: '10px',
                                        minHeight: '20px'
                                    }}>
                                        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>
                                            记录列表
                                        </label>

                                        {filteredRecords.length > 0 && selectedRecords.size > 0 && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeIn 0.2s ease' }}>
                                                <button
                                                    onClick={handleBatchDeleteRecords}
                                                    style={{
                                                        background: 'rgba(239, 68, 68, 0.1)',
                                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                                        color: '#ef4444',
                                                        fontSize: '10px',
                                                        padding: '2px 8px',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        transition: 'all 0.2s ease'
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
                                                        background: selectedRecords.size === filteredRecords.length && filteredRecords.length > 0 ? 'var(--primary-color)' : 'transparent',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    title="全选/取消全选"
                                                >
                                                    {selectedRecords.size === filteredRecords.length && filteredRecords.length > 0 && <Check size={10} color="white" />}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }} className="custom-scrollbar">
                                        {filteredRecords.length === 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.4, gap: '10px' }}>
                                                <Clock size={32} />
                                                <span style={{ fontSize: '12px' }}>
                                                    {filterStatus !== 'all' || filterSearch ? '未找到匹配的记录' : '暂无记录'}
                                                </span>
                                            </div>
                                        ) : (
                                            filteredRecords.map(record => (
                                                <div
                                                    key={record.id}
                                                    onClick={() => handleViewRecord(record)}
                                                    style={{
                                                        padding: '10px',
                                                        borderRadius: '10px',
                                                        background: selectedRecordId === record.id ? 'rgba(59, 130, 246, 0.1)' : 'var(--input-bg)',
                                                        border: selectedRecords.has(record.id) ? '1px solid var(--primary-color)' : '1px solid var(--glass-border)',
                                                        cursor: record.status === 'completed' ? 'pointer' : 'default',
                                                        transition: 'all 0.2s',
                                                        display: 'flex',
                                                        gap: '8px',
                                                        alignItems: 'flex-start'
                                                    }}
                                                    className="list-item-hover"
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
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                    >
                                                        {selectedRecords.has(record.id) && <Check size={10} color="white" />}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                            <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{record.filename}</div>
                                                            {getStatusIcon(record.status)}
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{record.templateName || record.templateId}</span>
                                                            <span style={{ fontSize: '9px', opacity: 0.5 }}>
                                                                {new Date(record.timestamp).toLocaleString('zh-CN', {
                                                                    month: '2-digit', day: '2-digit',
                                                                    hour: '2-digit', minute: '2-digit',
                                                                    hour12: false
                                                                }).replace(/\//g, '-')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </aside>
            </main>

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
