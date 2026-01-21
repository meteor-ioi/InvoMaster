import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TemplateCreator from './components/TemplateCreator';
import TemplateReference from './components/TemplateReference';
import ApiCall from './components/ApiCall';
import SystemSettings from './components/SystemSettings';
import { Edit3, Eye, Sun, Moon, Code, Maximize2, Minimize2, Cpu, Zap, Box, Monitor, ChevronDown, ChevronUp, Settings } from 'lucide-react';

// 获取系统主题偏好
const getSystemTheme = () => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

function App() {
    const [view, setView] = useState('creator'); // 'creator', 'reference', 'apicall'
    // 主题模式: 'system' | 'light' | 'dark'
    const [themeMode, setThemeMode] = useState(() => localStorage.getItem('hitl-theme-mode') || 'system');
    // 实际应用的主题: 'light' | 'dark'
    const [appliedTheme, setAppliedTheme] = useState(() => {
        const mode = localStorage.getItem('hitl-theme-mode') || 'system';
        return mode === 'system' ? getSystemTheme() : mode;
    });
    const [device, setDevice] = useState(localStorage.getItem('hitl-device') || 'cpu');
    const [isSidebarsCollapsed, setIsSidebarsCollapsed] = useState(false);
    const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(localStorage.getItem('hitl-header-collapsed') === 'true');
    const [isHoveringHeaderToggle, setIsHoveringHeaderToggle] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const toggleZenMode = () => {
        const newState = !isSidebarsCollapsed;
        setIsSidebarsCollapsed(newState);
        setIsHeaderCollapsed(newState);
        window.dispatchEvent(new CustomEvent('toggle-sidebars', { detail: { collapsed: newState } }));
    };


    // 根据主题模式计算实际应用的主题
    useEffect(() => {
        let newAppliedTheme;

        if (themeMode === 'system') {
            newAppliedTheme = getSystemTheme();
        } else {
            newAppliedTheme = themeMode;
        }

        setAppliedTheme(newAppliedTheme);
        document.documentElement.setAttribute('data-theme', newAppliedTheme);
        localStorage.setItem('hitl-theme-mode', themeMode);
    }, [themeMode]);

    // 监听系统主题变化
    useEffect(() => {
        if (themeMode !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => {
            const newTheme = e.matches ? 'dark' : 'light';
            setAppliedTheme(newTheme);
            document.documentElement.setAttribute('data-theme', newTheme);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [themeMode]);

    useEffect(() => {
        localStorage.setItem('hitl-device', device);
    }, [device]);

    useEffect(() => {
        localStorage.setItem('hitl-header-collapsed', isHeaderCollapsed);
    }, [isHeaderCollapsed]);

    // 监听打开系统设置的全局事件
    useEffect(() => {
        const handleOpenSettings = () => setIsSettingsOpen(true);
        window.addEventListener('open-system-settings', handleOpenSettings);
        return () => window.removeEventListener('open-system-settings', handleOpenSettings);
    }, []);

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
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* 顶栏导航 */}
            <header style={{
                height: isHeaderCollapsed ? '36px' : '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid var(--glass-border)',
                position: 'sticky',
                top: 0,
                zIndex: 1000,
                padding: '0 20px',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                overflow: 'visible'
            }}>
                {isHeaderCollapsed ? (
                    // 折叠状态：完整缩小版布局
                    <>
                        {/* 左侧：硬件加速（缩小版） */}
                        <div style={{
                            display: 'flex',
                            gap: '2px',
                            background: 'var(--input-bg)',
                            border: '1px solid var(--glass-border)',
                            padding: '2px',
                            borderRadius: '8px',
                            position: 'relative'
                        }}>
                            {devices.map(d => (
                                <button
                                    key={d.id}
                                    onClick={() => setDevice(d.id)}
                                    style={{
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: 'transparent',
                                        color: device === d.id ? 'white' : 'var(--text-secondary)',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        position: 'relative',
                                        zIndex: 1,
                                        transition: 'color 0.2s ease'
                                    }}
                                >
                                    {React.cloneElement(d.icon, { size: 13 })}
                                    {d.label}
                                    {device === d.id && (
                                        <motion.div
                                            layoutId="device-bg-mini"
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                                                borderRadius: '6px',
                                                zIndex: -1
                                            }}
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* 中间：Tab 导航（缩小图标版） */}
                        <div style={{
                            position: 'absolute',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            gap: '4px'
                        }}>
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setView(tab.id)}
                                    style={{
                                        padding: '4px 10px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: view === tab.id ? 'var(--primary-color)' : 'transparent',
                                        color: view === tab.id ? 'white' : 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {React.cloneElement(tab.icon, { size: 14 })}
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* 右侧：功能按钮组（缩小版） */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={toggleZenMode}
                                style={{
                                    background: 'var(--input-bg)',
                                    border: '1px solid var(--glass-border)',
                                    padding: '6px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    color: isSidebarsCollapsed ? 'var(--primary-color)' : 'var(--text-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s ease'
                                }}
                                title={isSidebarsCollapsed ? '还原界面布局' : '专注模式 (隐藏顶栏及侧栏)'}
                            >
                                {isSidebarsCollapsed ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                            </button>

                            <button
                                onClick={() => {
                                    const nextMode = themeMode === 'system' ? 'light' : themeMode === 'light' ? 'dark' : 'system';
                                    setThemeMode(nextMode);
                                }}
                                style={{
                                    background: 'var(--input-bg)',
                                    border: '1px solid var(--glass-border)',
                                    padding: '6px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    color: 'var(--text-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s ease'
                                }}
                                title={
                                    themeMode === 'system' ? '跟随系统主题' :
                                        themeMode === 'light' ? '白天主题' :
                                            '黑夜主题'
                                }
                            >
                                {themeMode === 'system' ? <Monitor size={14} /> :
                                    themeMode === 'light' ? <Sun size={14} /> :
                                        <Moon size={14} />}
                            </button>

                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                style={{
                                    background: 'var(--input-bg)',
                                    border: '1px solid var(--glass-border)',
                                    padding: '6px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    color: 'var(--text-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s ease'
                                }}
                                title="高级设置"
                            >
                                <Settings size={14} />
                            </button>
                        </div>
                    </>
                ) : (
                    // 展开状态：完整内容
                    <>
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

                        <div style={{
                            display: 'flex',
                            gap: '10px',
                            position: 'absolute',
                            left: '50%',
                            transform: 'translateX(-50%)'
                        }}>
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
                                    onClick={toggleZenMode}
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
                                    title={isSidebarsCollapsed ? '还原界面布局' : '专注模式 (隐藏顶栏及侧栏)'}
                                >
                                    {isSidebarsCollapsed ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
                                </button>

                                <button
                                    onClick={() => {
                                        // 循环切换: system -> light -> dark -> system
                                        const nextMode = themeMode === 'system' ? 'light' : themeMode === 'light' ? 'dark' : 'system';
                                        setThemeMode(nextMode);
                                    }}
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
                                    title={
                                        themeMode === 'system' ? '跟随系统主题' :
                                            themeMode === 'light' ? '白天主题' :
                                                '黑夜主题'
                                    }
                                >
                                    {themeMode === 'system' ? <Monitor size={18} /> :
                                        themeMode === 'light' ? <Sun size={18} /> :
                                            <Moon size={18} />}
                                </button>

                                <button
                                    onClick={() => setIsSettingsOpen(true)}
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
                                    title="高级设置"
                                >
                                    <Settings size={18} />
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* 折叠/展开按钮 (参考侧边栏样式) */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: '-20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 100,
                        cursor: 'pointer',
                        opacity: isHoveringHeaderToggle ? 0.7 : 0.5,
                        transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={() => setIsHoveringHeaderToggle(true)}
                    onMouseLeave={() => setIsHoveringHeaderToggle(false)}
                    onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
                >
                    <div style={{
                        width: '48px',
                        height: '20px',
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
                        {isHeaderCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </div>
                </div>
            </header>

            {/* 内容区域 */}
            <main style={{
                height: isHeaderCollapsed ? 'calc(100vh - 36px)' : 'calc(100vh - 60px)',
                position: 'relative',
                overflow: 'auto'
            }}>
                {view === 'creator' && <TemplateCreator theme={appliedTheme} setTheme={setThemeMode} device={device} headerCollapsed={isHeaderCollapsed} />}
                {view === 'reference' && <TemplateReference theme={appliedTheme} device={device} headerCollapsed={isHeaderCollapsed} />}
                {view === 'apicall' && <ApiCall theme={appliedTheme} device={device} headerCollapsed={isHeaderCollapsed} />}
            </main>

            {/* 系统设置弹窗 */}
            <SystemSettings
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                theme={appliedTheme}
            />
        </div>
    );
}

export default App;
