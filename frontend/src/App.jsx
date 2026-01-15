import React, { useState, useEffect } from 'react';
import Home from './components/Home';
import TemplateCreator from './components/TemplateCreator';
import TemplateReference from './components/TemplateReference';
import { Home as HomeIcon, Sun, Moon } from 'lucide-react';

function App() {
    const [view, setView] = useState('home'); // 'home', 'creator', 'reference'
    const [theme, setTheme] = useState('dark');

    useEffect(() => {
        document.body.className = theme;
    }, [theme]);

    const handleNavigate = (targetView) => {
        setView(targetView);
    };

    const containerStyle = {
        minHeight: '100vh',
        background: theme === 'dark' ? '#0f172a' : '#f8fafc',
        color: theme === 'dark' ? '#f8fafc' : '#0f172a',
        transition: 'all 0.3s ease'
    };

    return (
        <div style={containerStyle}>
            {view !== 'home' && (
                <div style={{ position: 'fixed', top: '20px', left: '20px', display: 'flex', gap: '10px', zIndex: 1000 }}>
                    <button
                        onClick={() => setView('home')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            background: 'var(--glass-bg)', padding: '8px 12px',
                            border: '1px solid var(--glass-border)', borderRadius: '8px',
                            color: 'var(--text-primary)', cursor: 'pointer',
                            minWidth: '96px', justifyContent: 'center'
                        }}
                    >
                        <HomeIcon size={16} /> 首页
                    </button>
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        style={{
                            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                            padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            minWidth: '96px'
                        }}
                    >
                        {theme === 'dark' ? <><Sun size={16} /> 明亮</> : <><Moon size={16} /> 暗黑</>}
                    </button>
                </div>
            )}

            {view === 'home' && (
                <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    style={{
                        position: 'fixed', top: '20px', left: '20px',
                        background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                        padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-primary)',
                        zIndex: 1000, display: 'flex', alignItems: 'center', gap: '5px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                >
                    {theme === 'dark' ? <><Sun size={16} /> 明亮</> : <><Moon size={16} /> 暗黑</>}
                </button>
            )}

            {view === 'home' && <Home onNavigate={handleNavigate} />}
            {view === 'creator' && <TemplateCreator theme={theme} setTheme={setTheme} onBack={() => setView('home')} />}
            {view === 'reference' && <TemplateReference theme={theme} />}
        </div>
    );
}

export default App;
