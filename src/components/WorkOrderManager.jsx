import React, { useState } from 'react';
import { Clipboard, Search, CheckCircle, AlertCircle, Barcode } from 'lucide-react';

/**
 * WorkOrderManager
 * =====================================================
 * Handles selection or scanning of Job IDs/Work Orders.
 * Essential for traceability in industrial environments.
 * =====================================================
 */
const WorkOrderManager = ({ onSelect, currentWorkOrder }) => {
    const [inputValue, setInputValue] = useState(currentWorkOrder || '');
    const [isConfirmed, setIsConfirmed] = useState(!!currentWorkOrder);

    const handleConfirm = () => {
        if (inputValue.trim()) {
            setIsConfirmed(true);
            onSelect(inputValue.trim());
        }
    };

    const handleReset = () => {
        setIsConfirmed(false);
        setInputValue('');
        onSelect('');
    };

    return (
        <div style={{
            padding: '16px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '4px',
            border: `1px solid ${isConfirmed ? '#2e7d32' : 'var(--border-color)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            width: '100%',
            transition: 'all 0.3s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
            <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '4px',
                backgroundColor: isConfirmed ? 'rgba(46, 125, 50, 0.1)' : 'rgba(0, 123, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {isConfirmed ? <CheckCircle size={20} color="#2e7d32" /> : <Clipboard size={20} color="#007bff" />}
            </div>

            <div style={{ flex: 1 }}>
                <div style={{ color: '#94a3b8', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '4px' }}>
                    TRACKING IDENTITY
                </div>
                {isConfirmed ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '1.2rem' }}>{inputValue}</span>
                        <span style={{ color: '#2e7d32', fontSize: '0.7rem', backgroundColor: 'rgba(46, 125, 50, 0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>ACTIVE</span>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                                placeholder="SCAN OR TYPE WORK ORDER (JOB ID)"
                                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                                style={{
                                    width: '100%',
                                    padding: '12px 12px 12px 40px',
                                    backgroundColor: 'var(--bg-primary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '4px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.9rem',
                                    outline: 'none',
                                    fontWeight: 500,
                                    textTransform: 'uppercase'
                                }}
                            />
                        </div>
                        <button
                            onClick={handleConfirm}
                            disabled={!inputValue.trim()}
                            className="btn btn-primary"
                            style={{
                                padding: '0 25px',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                fontSize: '0.9rem'
                            }}
                        >
                            CONFIRM
                        </button>
                    </div>
                )}
            </div>

            {isConfirmed && (
                <button
                    onClick={handleReset}
                    style={{
                        padding: '8px 15px',
                        backgroundColor: 'transparent',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 600
                    }}
                >
                    CHANGE
                </button>
            )}

            {!isConfirmed && (
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                    <Barcode size={16} />
                    SCANNER READY
                </div>
            )}
        </div>
    );
};

export default WorkOrderManager;
