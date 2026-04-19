import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const SHAPE_CATEGORIES = [
    {
        name: 'Lines',
        shapes: [
            { type: 'line', label: 'Line' },
            { type: 'arrow_right', label: 'Arrow' },
            { type: 'double_arrow_line', label: 'Double Arrow' }
        ]
    },
    {
        name: 'Rectangles',
        shapes: [
            { type: 'rectangle', label: 'Rectangle' },
            { type: 'rounded_rectangle', label: 'Rounded Rectangle' }
        ]
    },
    {
        name: 'Basic Shapes',
        shapes: [
            { type: 'ellipse', label: 'Oval' },
            { type: 'triangle', label: 'Isosceles Triangle' },
            { type: 'parallelogram', label: 'Parallelogram' },
            { type: 'trapezium', label: 'Trapezoid' },
            { type: 'diamond', label: 'Diamond' },
            { type: 'pentagon', label: 'Regular Pentagon' },
            { type: 'hexagon', label: 'Hexagon' }
        ]
    },
    {
        name: 'Block Arrows',
        shapes: [
            { type: 'arrow_right', label: 'Right Arrow' },
            { type: 'arrow_left', label: 'Left Arrow' },
            { type: 'arrow_up', label: 'Up Arrow' },
            { type: 'arrow_down', label: 'Down Arrow' }
        ]
    }
];

const ShapeIcon = ({ type }) => {
    switch (type) {
        case 'line':
            return <svg viewBox="0 0 24 24" width="100%" height="100%"><line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
        case 'double_arrow_line':
            return (
                <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="20" x2="20" y2="4" />
                    <polyline points="14 4 20 4 20 10" />
                    <polyline points="4 10 4 20 10 20" />
                </svg>
            );
        case 'rectangle':
            return <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="6" width="18" height="12" /></svg>;
        case 'rounded_rectangle':
            return <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="6" width="18" height="12" rx="4" /></svg>;
        case 'ellipse':
            return <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="12" rx="10" ry="7" /></svg>;
        case 'triangle':
            return <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12,4 21,18 3,18" strokeLinejoin="round" /></svg>;
        case 'parallelogram':
            return <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="7,6 21,6 17,18 3,18" strokeLinejoin="round" /></svg>;
        case 'trapezium':
            return <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="7,6 17,6 21,18 3,18" strokeLinejoin="round" /></svg>;
        case 'diamond':
            return <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12,3 21,12 12,21 3,12" strokeLinejoin="round" /></svg>;
        case 'pentagon':
            return <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12,3 22,10 18,21 6,21 2,10" strokeLinejoin="round" /></svg>;
        case 'hexagon':
            return <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12,3 21,7 21,17 12,21 3,17 3,7" strokeLinejoin="round" /></svg>;
        case 'arrow_right':
            return <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3,9 15,9 15,5 23,12 15,19 15,15 3,15" strokeLinejoin="round" /></svg>;
        case 'arrow_left':
            return <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="21,9 9,9 9,5 1,12 9,19 9,15 21,15" strokeLinejoin="round" /></svg>;
        case 'arrow_up':
            return <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="9,21 9,9 5,9 12,1 19,9 15,9 15,21" strokeLinejoin="round" /></svg>;
        case 'arrow_down':
            return <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="9,3 9,15 5,15 12,23 19,15 15,15 15,3" strokeLinejoin="round" /></svg>;
        default:
            return <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="6" width="18" height="12" /></svg>;
    }
};

const ShapePicker = ({ onSelect, onClose, isEmbedded = false }) => {
    const containerStyle = isEmbedded ? {
        width: '100%',
        padding: '4px',
        backgroundColor: 'transparent'
    } : {
        position: 'absolute',
        top: '100%',
        left: '0',
        marginTop: '4px',
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
        zIndex: 200,
        width: '320px',
        maxHeight: '400px',
        overflowY: 'auto',
        padding: '12px'
    };

    return (
        <div 
            style={containerStyle}
            onMouseLeave={isEmbedded ? undefined : onClose}
        >
            {SHAPE_CATEGORIES.map((category, catIdx) => (
                <div key={category.name} style={{ marginBottom: catIdx === SHAPE_CATEGORIES.length - 1 ? '0' : '15px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid #f1f5f9' }}>
                        {category.name}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '4px' }}>
                        {category.shapes.map((shape, idx) => (
                            <button
                                key={`${shape.type}-${idx}`}
                                onClick={() => {
                                    onSelect(shape.type);
                                    if (onClose) onClose();
                                }}
                                title={shape.label}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    padding: '6px',
                                    backgroundColor: 'transparent',
                                    border: '1px solid transparent',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    color: '#475569',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.1s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                                    e.currentTarget.style.borderColor = '#cbd5e1';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.borderColor = 'transparent';
                                }}
                            >
                                <ShapeIcon type={shape.type} />
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ShapePicker;
