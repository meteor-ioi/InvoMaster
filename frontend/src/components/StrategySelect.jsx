import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function StrategySelect({ value, onChange, options }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const selectedOption = options.find(opt => opt.value === value) || options[0];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue) => {
        onChange({ target: { value: optionValue } }); // Mock event object to match select interface
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--glass-border)',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectedOption.icon && <selectedOption.icon size={14} style={{ opacity: 0.7 }} />}
                    <span>{selectedOption.label}</span>
                </div>
                <ChevronDown size={14} style={{ opacity: 0.5, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </div>

            {isOpen && (
                <div className="glass-card animate-slide-up" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    zIndex: 100,
                    padding: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    border: '1px solid var(--glass-border)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '8px'
                }}>
                    {options.map((option) => (
                        <div
                            key={option.value}
                            onClick={() => handleSelect(option.value)}
                            style={{
                                padding: '6px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: value === option.value ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                color: value === option.value ? 'var(--primary-color)' : 'var(--text-primary)'
                            }}
                            className="list-item-hover"
                        >
                            {option.icon && <option.icon size={14} style={{ opacity: value === option.value ? 1 : 0.7 }} />}
                            <span>{option.label}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
