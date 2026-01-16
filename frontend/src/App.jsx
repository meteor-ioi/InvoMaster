import React, { useState } from 'react';
import Home from './components/Home';
import TemplateCreator from './components/TemplateCreator';
import TemplateReference from './components/TemplateReference';
import { Home as HomeIcon } from 'lucide-react';

function App() {
    const [view, setView] = useState('home'); // 'home', 'creator', 'reference'

    const handleNavigate = (targetView) => {
        setView(targetView);
    };

    return (
        <div style={{ minHeight: '100vh' }}>
            {view !== 'home' && (
                <button
                    onClick={() => setView('home')}
                    style={{
                        position: 'fixed', top: '20px', left: '20px',
                        display: 'flex', alignItems: 'center', gap: '5px',
                        background: 'var(--glass-bg)', padding: '8px 12px',
                        border: '1px solid var(--glass-border)', borderRadius: '8px',
                        color: 'var(--text-primary)', cursor: 'pointer', zIndex: 100
                    }}
                >
                    <HomeIcon size={16} /> 首页
                </button>
            )}

            {view === 'home' && <Home onNavigate={handleNavigate} />}
            {view === 'creator' && <TemplateCreator onBack={() => setView('home')} />}
            {view === 'reference' && <TemplateReference />}
        </div>
    );
}

export default App;
