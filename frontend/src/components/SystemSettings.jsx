import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Download, UploadCloud, CheckCircle, AlertTriangle, HardDrive, FolderOpen, Info, RefreshCw } from 'lucide-react';

const SystemSettings = ({ isOpen, onClose, theme }) => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [downloadingIds, setDownloadingIds] = useState([]);
    const [progress, setProgress] = useState({}); // { modelId: percentage }

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const response = await fetch('/system/status');
            const data = await response.json();
            setStatus(data);
        } catch (error) {
            console.error("Failed to fetch system status:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchStatus();
        }
    }, [isOpen]);

    const handleDownload = async (modelId) => {
        setDownloadingIds(prev => [...prev, modelId]);
        setProgress(prev => ({ ...prev, [modelId]: 0 }));

        try {
            await fetch(`/system/models/download?model_id=${modelId}`, { method: 'POST' });

            // Start polling for progress
            const pollInterval = setInterval(async () => {
                try {
                    const res = await fetch('/system/models/progress');
                    const progData = await res.json();
                    const currentProgress = progData[modelId];

                    if (currentProgress !== undefined) {
                        setProgress(prev => ({ ...prev, [modelId]: currentProgress }));

                        if (currentProgress >= 100 || currentProgress === -1) {
                            clearInterval(pollInterval);
                            setDownloadingIds(prev => prev.filter(id => id !== modelId));
                            fetchStatus(); // Refresh status when done
                        }
                    }
                } catch (e) {
                    console.error("Polling error:", e);
                    clearInterval(pollInterval);
                }
            }, 1000);

        } catch (error) {
            console.error("Download failed:", error);
            setDownloadingIds(prev => prev.filter(id => id !== modelId));
        }
    };

    const handleImport = async (modelId) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);

            setLoading(true);
            try {
                await fetch(`/system/models/import?model_id=${modelId}`, {
                    method: 'POST',
                    body: formData
                });
                fetchStatus();
            } catch (error) {
                console.error("Import failed:", error);
            } finally {
                setLoading(false);
            }
        };
        input.click();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div style={{
                position: 'fixed',
                inset: 0,
                zIndex: 2000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}>
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.4)',
                        backdropFilter: 'blur(5px)'
                    }}
                />

                {/* Modal Content */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    style={{
                        width: '100%',
                        maxWidth: '650px',
                        background: 'var(--glass-bg)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '24px',
                        border: '1px solid var(--glass-border)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        overflow: 'hidden',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '20px 24px',
                        borderBottom: '1px solid var(--glass-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(255, 255, 255, 0.02)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff'
                            }}>
                                <Settings size={20} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>高级设置</h2>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>管理推理引擎模型及系统环境</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                border: 'none',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            className="hover-bright"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Body */}
                    <div style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }} className="custom-scrollbar">
                        {/* Models Section */}
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    核心模型状态
                                    {loading && <RefreshCw size={14} className="animate-spin" style={{ opacity: 0.6 }} />}
                                </h3>
                                <button
                                    onClick={fetchStatus}
                                    style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '12px', cursor: 'pointer', padding: '4px' }}
                                >
                                    刷新状态
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {status?.models?.map(model => (
                                    <div
                                        key={model.id}
                                        style={{
                                            padding: '16px',
                                            borderRadius: '16px',
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            border: '1px solid var(--glass-border)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '12px',
                                                background: model.exists ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: model.exists ? 'var(--success-color)' : '#f59e0b'
                                            }}>
                                                {model.exists ? <CheckCircle size={22} /> : <AlertTriangle size={22} />}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{model.name}</span>
                                                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', background: 'var(--input-bg)', padding: '2px 6px', borderRadius: '4px' }}>{model.size}</span>
                                                </div>
                                                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>{model.description}</p>

                                                {/* Progress Bar */}
                                                {downloadingIds.includes(model.id) && (
                                                    <div style={{ marginTop: '8px', width: '100%' }}>
                                                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${progress[model.id] || 0}%` }}
                                                                style={{ height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }}
                                                            />
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                            <span>{progress[model.id] === -1 ? '下载失败' : '正在补全资源...'}</span>
                                                            <span>{progress[model.id] > 0 ? `${progress[model.id]}%` : ''}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {model.exists ? (
                                                <span style={{ fontSize: '12px', color: 'var(--success-color)', fontWeight: '500', padding: '6px 12px' }}>已就绪</span>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleDownload(model.id)}
                                                        disabled={downloadingIds.includes(model.id)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            borderRadius: '8px',
                                                            border: 'none',
                                                            background: downloadingIds.includes(model.id) ? 'rgba(255,255,255,0.1)' : 'var(--primary-color)',
                                                            color: '#white',
                                                            fontSize: '12px',
                                                            fontWeight: '500',
                                                            cursor: downloadingIds.includes(model.id) ? 'not-allowed' : 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px'
                                                        }}
                                                    >
                                                        {downloadingIds.includes(model.id) ? (
                                                            <><RefreshCw size={14} className="animate-spin" /> 下载中...</>
                                                        ) : (
                                                            <><Download size={14} /> 在线下载</>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleImport(model.id)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            borderRadius: '8px',
                                                            border: '1px solid var(--glass-border)',
                                                            background: 'rgba(255, 255, 255, 0.05)',
                                                            color: 'var(--text-primary)',
                                                            fontSize: '12px',
                                                            fontWeight: '500',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px'
                                                        }}
                                                    >
                                                        <UploadCloud size={14} /> 导入
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* System Info Section */}
                        <div style={{
                            padding: '16px',
                            borderRadius: '16px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid var(--glass-border)',
                        }}>
                            <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Info size={14} color="var(--primary-color)" /> 环境信息
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', fontSize: '12px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>应用数据路径:</span>
                                <span style={{ color: 'var(--text-primary)', wordBreak: 'break-all', fontFamily: 'monospace' }}>{status?.app_data_dir || '加载中...'}</span>

                                <span style={{ color: 'var(--text-secondary)' }}>运行平台:</span>
                                <span style={{ color: 'var(--text-primary)' }}>{status?.platform || '加载中...'}</span>

                                <span style={{ color: 'var(--text-secondary)' }}>核心版本:</span>
                                <span style={{ color: 'var(--text-primary)' }}>v{status?.version || '1.1.0'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{
                        padding: '16px 24px',
                        borderTop: '1px solid var(--glass-border)',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        background: 'rgba(0, 0, 0, 0.1)'
                    }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '8px 24px',
                                borderRadius: '10px',
                                border: 'none',
                                background: 'var(--primary-color)',
                                color: '#fff',
                                fontSize: '13px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                            }}
                        >
                            完成
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default SystemSettings;
