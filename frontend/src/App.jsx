import React, { useState, useEffect } from 'react';
import TemplateCreator from './components/TemplateCreator';
import TemplateReference from './components/TemplateReference';
import ApiCall from './components/ApiCall';
import { Edit3, Eye, Sun, Moon, Code, ChevronsLeftRight, ChevronsRightLeft } from 'lucide-react';

function App() {
    const [view, setView] = useState('creator'); // 'creator', 'reference', 'apicall'
    const [theme, setTheme] = useState(localStorage.getItem('babeldoc-theme') || 'dark');
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

    const tabs = [
        { id: 'creator', label: '模板制作', icon: <Edit3 size={18} /> },
        { id: 'reference', label: '模板引用', icon: <Eye size={18} /> },
        { id: 'apicall', label: 'API 调用', icon: <Code size={18} /> }
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
                <div style={{ width: '150px' }}>
                    <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>YingdaoDOC</h1>
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

                <div style={{ width: '150px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
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
            </header>

            {/* 内容区域 */}
            <main style={{ flex: 1, position: 'relative' }}>
                {view === 'creator' && <TemplateCreator theme={theme} setTheme={setTheme} />}
                {view === 'reference' && <TemplateReference theme={theme} />}
                {view === 'apicall' && <ApiCall theme={theme} />}
            </main>
        </div>
    );
}

export default App;
