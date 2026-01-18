import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TemplateCreator from './components/TemplateCreator';
import TemplateReference from './components/TemplateReference';
import ApiCall from './components/ApiCall';
import { Edit3, Eye, Sun, Moon, Code, ChevronsLeftRight, ChevronsRightLeft, Cpu, Zap, Box } from 'lucide-react';

function App() {
    const [view, setView] = useState('creator'); // 'creator', 'reference', 'apicall'
    const [theme, setTheme] = useState(localStorage.getItem('babeldoc-theme') || 'dark');
    const [device, setDevice] = useState(localStorage.getItem('babeldoc-device') || 'cpu');
    const [isSidebarsCollapsed, setIsSidebarsCollapsed] = useState(false);

    const toggleSidebars = () => {
        const newState = !isSidebarsCollapsed;
        setIsSidebarsCollapsed(newState);
        window.dispatchEvent(new CustomEvent('toggle-sidebars', { detail: { collapsed: newState } }));
    };

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('babeldoc-theme', theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('babeldoc-device', device);
    }, [device]);

    const tabs = [
        { id: 'creator', label: '模板制作', icon: <Edit3 size={18} /> },
        { id: 'reference', label: '模板引用', icon: <Eye size={18} /> },
        { id: 'apicall', label: 'API 调用', icon: <Code size={18} /> }
    ];

    const devices = [
        { id: 'cpu', label: 'CPU', icon: <Box size={14} /> },
        { id: 'cuda', label: 'GPU', icon: <Zap size={14} /> },
        { id: 'mps', label: 'MPS', icon: <Cpu size={14} /> }
    ];

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* 顶栏导航 */}
            <header style={{
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid var(--glass-border)',
                position: 'sticky',
                top: 0,
                zIndex: 1000,
                padding: '0 20px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {/* 硬件加速选择器 (移动至左侧) */}
                    <div style={{
                        background: 'var(--input-bg)',
                        border: '1px solid var(--glass-border)',
                        padding: '3px',
                        borderRadius: '12px',
                        display: 'flex',
                        gap: '2px',
                        position: 'relative',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                        {devices.map(d => (
                            <button
                                key={d.id}
                                onClick={() => setDevice(d.id)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '9px',
                                    border: 'none',
                                    background: 'transparent',
                                    color: device === d.id ? 'white' : 'var(--text-secondary)',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    position: 'relative',
                                    zIndex: 1,
                                    transition: 'color 0.2s ease'
                                }}
                            >
                                {d.icon}
                                {d.label}
                                {device === d.id && (
                                    <motion.div
                                        layoutId="device-bg"
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                                            borderRadius: '9px',
                                            zIndex: -1,
                                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                                        }}
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setView(tab.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 20px',
                                borderRadius: '12px',
                                border: '1px solid transparent',
                                background: view === tab.id ? 'var(--primary-color)' : 'transparent',
                                color: view === tab.id ? 'white' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                transition: 'all 0.2s ease',
                                fontSize: '14px'
                            }}
                            className={view === tab.id ? '' : 'nav-tab-hover'}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={toggleSidebars}
                            style={{
                                background: 'var(--input-bg)',
                                border: '1px solid var(--glass-border)',
                                padding: '10px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                color: isSidebarsCollapsed ? 'var(--primary-color)' : 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                            title={isSidebarsCollapsed ? '展开所有侧边栏' : '折叠所有侧边栏'}
                        >
                            {isSidebarsCollapsed ? <ChevronsLeftRight size={18} /> : <ChevronsRightLeft size={18} />}
                        </button>

                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            style={{
                                background: 'var(--input-bg)',
                                border: '1px solid var(--glass-border)',
                                padding: '10px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                color: 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                            title={theme === 'dark' ? '切换至浅色模式' : '切换至深色模式'}
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                    </div>
                </div>
            </header>

            {/* 内容区域 */}
            <main style={{ flex: 1, position: 'relative' }}>
                {view === 'creator' && <TemplateCreator theme={theme} setTheme={setTheme} device={device} />}
                {view === 'reference' && <TemplateReference theme={theme} device={device} />}
                {view === 'apicall' && <ApiCall theme={theme} device={device} />}
            </main>
        </div>
    );
}

export default App;
