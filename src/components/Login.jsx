import React, { useState } from 'react';
import { User, Lock, ArrowRight, Activity, Settings, AlertCircle } from 'lucide-react';
import { login } from '../utils/auth';

const Login = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Simulate brief network delay for realism
            await new Promise(resolve => setTimeout(resolve, 600));

            const user = login(username, password);
            if (user) {
                onLoginSuccess(user);
            } else {
                setError('Invalid username or password.');
            }
        } catch (err) {
            setError('An error occurred during authentication.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            backgroundColor: '#0f172a',
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* Left side: Branding / Manufacturing Visual */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: '#001e3c'
            }}>
                <div style={{
                    position: 'absolute',
                    top: '40px',
                    left: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    zIndex: 10
                }}>
                    <div style={{
                        backgroundColor: '#3b82f6',
                        padding: '10px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Settings size={28} color="white" />
                    </div>
                    <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'white', letterSpacing: '2px' }}>MAVI-MES</span>
                </div>

                <div style={{ textAlign: 'center', position: 'relative', zIndex: 10 }}>
                    <Activity size={120} color="rgba(255,255,255,0.05)" style={{ marginBottom: '-60px' }} />
                    <h1 style={{ fontSize: '3rem', fontWeight: 900, color: 'white', marginBottom: '16px' }}>
                        Enterprise Frontline
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '1.2rem', maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' }}>
                        Connecting operations, enforcing quality, and driving efficiency across the shop floor.
                    </p>
                </div>
            </div>

            {/* Right side: Login Form */}
            <div style={{
                width: '500px',
                backgroundColor: 'white',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '0 60px',
                boxShadow: '-10px 0 30px rgba(0,0,0,0.2)'
            }}>
                <div style={{ marginBottom: '40px' }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                        Sign In
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '1rem' }}>
                        Enter your factory credentials to access your workspace.
                    </p>
                </div>

                {error && (
                    <div style={{
                        backgroundColor: '#fee2e2',
                        border: '1px solid #ef4444',
                        color: '#b91c1c',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        marginBottom: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '0.9rem',
                        fontWeight: 600
                    }}>
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                            Username / Operator ID
                        </label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} color="#64748b" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="e.g. admin, operator"
                                disabled={isLoading}
                                style={{
                                    width: '100%',
                                    padding: '14px 16px 14px 44px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    backgroundColor: '#f8fafc',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                            Password / PIN
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} color="#64748b" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                disabled={isLoading}
                                style={{
                                    width: '100%',
                                    padding: '14px 16px 14px 44px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    backgroundColor: '#f8fafc',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                    boxSizing: 'border-box',
                                    letterSpacing: '2px'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !username || !password}
                        style={{
                            marginTop: '10px',
                            backgroundColor: (isLoading || !username || !password) ? '#94a3b8' : '#3b82f6',
                            color: 'white',
                            padding: '16px',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '1rem',
                            fontWeight: 700,
                            cursor: (isLoading || !username || !password) ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            transition: 'background-color 0.2s'
                        }}
                    >
                        {isLoading ? 'Authenticating...' : 'Sign In'} 
                        {!isLoading && <ArrowRight size={18} />}
                    </button>
                    
                    {/* Helper text for demo / testing */}
                    <div style={{ marginTop: '30px', padding: '16px', backgroundColor: '#f1f5f9', borderRadius: '8px', fontSize: '0.8rem', color: '#64748b', lineHeight: '1.5' }}>
                        <strong>Demo Accounts:</strong><br />
                        Admin: <span style={{ fontFamily: 'monospace' }}>admin</span> / <span style={{ fontFamily: 'monospace' }}>123</span><br />
                        Operator: <span style={{ fontFamily: 'monospace' }}>operator</span> / <span style={{ fontFamily: 'monospace' }}>123</span>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
