import React, { useState, useRef, useEffect } from 'react';
import { Palette, ChevronDown, Check } from 'lucide-react';

const THEME_BASE_COLORS = [
    '#ffffff', '#000000', '#e7e6e6', '#44546a', '#4472c4', '#ed7d31', '#a5a5a5', '#ffc000', '#5b9bd5', '#70ad47'
];

const STANDARD_COLORS = [
    '#c00000', '#ff0000', '#ffc000', '#ffff00', '#92d050', '#00b050', '#00b0f0', '#0070c0', '#002060', '#7030a0'
];

// Helper to adjust color lightness
function adjustColor(color, percent) {
    let num = parseInt(color.replace('#', ''), 16);
    let amt = Math.round(2.55 * percent);
    let R = (num >> 16) + amt;
    let G = (num >> 8 & 0x00FF) + amt;
    let B = (num & 0x0000FF) + amt;

    const clamp = (val) => Math.min(255, Math.max(0, val));
    
    R = clamp(R);
    G = clamp(G);
    B = clamp(clamp(B));

    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

// Special case for white and black columns to match Excel/Office
const getColumnColors = (base) => {
    if (base === '#ffffff') return ['#ffffff', '#f2f2f2', '#e6e6e6', '#d9d9d9', '#bfbfbf', '#a6a6a6'];
    if (base === '#000000') return ['#000000', '#7f7f7f', '#595959', '#3f3f3f', '#262626', '#0c0c0c'];
    
    // Simplified Excel-like tints/shades
    return [
        base,
        adjustColor(base, 80),
        adjustColor(base, 60),
        adjustColor(base, 40),
        adjustColor(base, -25),
        adjustColor(base, -50),
    ];
};

const ColorPicker = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef(null);
    const nativeInputRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleSelect = (color) => {
        onChange(color);
        setIsOpen(false);
    };

    const isSelected = (color) => value?.toLowerCase() === color?.toLowerCase();

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <button 
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '6px 10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: 'white',
                    height: '40px',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
                onMouseLeave={e => e.currentTarget.style.borderColor = isOpen ? '#3b82f6' : '#e2e8f0'}
            >
                <div style={{ 
                    width: '24px', 
                    height: '24px', 
                    borderRadius: '4px', 
                    backgroundColor: value === 'transparent' || !value ? 'transparent' : value,
                    border: '1px solid rgba(0,0,0,0.1)',
                    backgroundImage: value === 'transparent' || !value ? 'linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%, #ddd), linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%, #ddd)' : 'none',
                    backgroundSize: '8px 8px',
                    backgroundPosition: '0 0, 4px 4px',
                    flexShrink: 0
                }} />
                <span style={{ flex: 1, fontSize: '0.85rem', color: '#1e293b', textAlign: 'left', fontWeight: 500 }}>
                    {value === 'transparent' ? 'No Fill' : value || '#000000'}
                </span>
                <ChevronDown size={14} color="#64748b" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {isOpen && (
                <div 
                    ref={popoverRef}
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: 0,
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        padding: '16px',
                        zIndex: 2000,
                        width: '260px',
                        animation: 'fadeIn 0.2s ease-out'
                    }}
                >
                    <style>{`
                        @keyframes fadeIn {
                            from { opacity: 0; transform: translateY(-10px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                    `}</style>

                    <div style={{ marginBottom: '10px', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Theme Colors</div>
                    
                    {/* Header Base Colors */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '2px', marginBottom: '4px' }}>
                        {THEME_BASE_COLORS.map(color => (
                            <div 
                                key={color}
                                onClick={() => handleSelect(color)}
                                style={{ 
                                    width: '20px', 
                                    height: '20px', 
                                    backgroundColor: color, 
                                    border: isSelected(color) ? '2px solid #3b82f6' : '1px solid rgba(0,0,0,0.1)', 
                                    cursor: 'pointer',
                                    borderRadius: '2px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                title={color}
                            >
                                {isSelected(color) && <Check size={12} color={color === '#ffffff' ? '#3b82f6' : '#ffffff'} />}
                            </div>
                        ))}
                    </div>
                    
                    {/* Tints/Shades Matrix */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '2px', marginBottom: '16px' }}>
                        {[1, 2, 3, 4, 5].map(rowIdx => (
                            <React.Fragment key={rowIdx}>
                                {THEME_BASE_COLORS.map(base => {
                                    const colColors = getColumnColors(base);
                                    const color = colColors[rowIdx];
                                    return (
                                        <div 
                                            key={`${base}-${rowIdx}`}
                                            onClick={() => handleSelect(color)}
                                            style={{ 
                                                width: '20px', 
                                                height: '20px', 
                                                backgroundColor: color, 
                                                border: isSelected(color) ? '2px solid #3b82f6' : '1px solid rgba(0,0,0,0.05)', 
                                                cursor: 'pointer',
                                                borderRadius: '1px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            title={color}
                                        >
                                            {isSelected(color) && <Check size={10} color={['#ffffff', '#f2f2f2', '#e7e6e6'].includes(color.toLowerCase()) ? '#3b82f6' : '#ffffff'} />}
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>

                    <div style={{ marginBottom: '10px', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Standard Colors</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '2px', marginBottom: '16px' }}>
                        {STANDARD_COLORS.map(color => (
                            <div 
                                key={color}
                                onClick={() => handleSelect(color)}
                                style={{ 
                                    width: '20px', 
                                    height: '20px', 
                                    backgroundColor: color, 
                                    border: isSelected(color) ? '2px solid #3b82f6' : '1px solid rgba(0,0,0,0.1)', 
                                    cursor: 'pointer',
                                    borderRadius: '2px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                title={color}
                            >
                                {isSelected(color) && <Check size={12} color="#ffffff" />}
                            </div>
                        ))}
                    </div>

                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <button 
                            type="button"
                            onClick={() => handleSelect('transparent')}
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '10px', 
                                padding: '8px', 
                                background: 'none', 
                                border: 'none', 
                                cursor: 'pointer', 
                                width: '100%',
                                textAlign: 'left',
                                borderRadius: '6px',
                                transition: 'background-color 0.2s',
                                color: isSelected('transparent') ? '#3b82f6' : '#1e293b',
                                fontWeight: isSelected('transparent') ? 700 : 500
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <div style={{ 
                                width: '20px', 
                                height: '20px', 
                                borderRadius: '3px',
                                border: '1px solid #cbd5e1',
                                backgroundImage: 'linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%, #ddd), linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%, #ddd)',
                                backgroundSize: '6px 6px',
                                backgroundPosition: '0 0, 3px 3px'
                            }} />
                            <span style={{ fontSize: '0.8rem' }}>No Fill</span>
                        </button>
                        
                        <button 
                            type="button"
                            onClick={() => nativeInputRef.current?.click()}
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '10px', 
                                padding: '8px', 
                                background: 'none', 
                                border: 'none', 
                                cursor: 'pointer', 
                                width: '100%',
                                textAlign: 'left',
                                borderRadius: '6px',
                                transition: 'background-color 0.2s',
                                color: '#1e293b',
                                fontWeight: 500
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <Palette size={20} color="#64748b" />
                            <span style={{ fontSize: '0.8rem' }}>More Colors...</span>
                        </button>
                        <input 
                            ref={nativeInputRef}
                            type="color" 
                            style={{ display: 'none' }} 
                            onChange={(e) => handleSelect(e.target.value)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ColorPicker;
