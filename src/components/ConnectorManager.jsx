import React, { useState, useEffect, useRef } from 'react';
import { 
    Link2, Plus, Search, MoreVertical, Globe, Server, Database, 
    AlertCircle, ChevronRight, Settings2, Code, Activity, 
    ShieldCheck, Cloud, Layout, ArrowLeft, Save, Trash2, Zap, Play,
    X, ChevronDown, ChevronUp, Lock, HardDrive, Key, FilePlus
} from 'lucide-react';
import { getIntegrationConnectors, saveIntegrationConnector, deleteIntegrationConnector } from '../utils/database';
import CreateConnectorModal from './CreateConnectorModal';


const ConnectorManager = () => {
    const [connectors, setConnectors] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedConnector, setSelectedConnector] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [activeEnv, setActiveEnv] = useState('dev');
    const [activeTab, setActiveTab] = useState('functions');

    useEffect(() => {
        loadConnectors();
    }, []);

    const loadConnectors = async () => {
        setLoading(true);
        try {
            const data = await getIntegrationConnectors();
            setConnectors(data);
        } catch (error) {
            console.error('Failed to load connectors:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateConnector = async (data) => {
        try {
            const newConnector = { 
                ...data,
                functions: [],
                environments: {
                    dev: { 
                        serverAddress: data.serverAddress, 
                        port: data.port, 
                        databaseName: data.databaseName,
                        supabaseUrl: data.supabaseUrl,
                        supabaseKey: data.supabaseKey,
                        spreadsheetId: data.spreadsheetId,
                        sheetName: data.sheetName,
                        mqttSettings: data.mqttSettings
                    },
                    prod: { 
                        serverAddress: data.serverAddress, 
                        port: data.port, 
                        databaseName: data.databaseName,
                        supabaseUrl: data.supabaseUrl,
                        supabaseKey: data.supabaseKey,
                        spreadsheetId: data.spreadsheetId,
                        sheetName: data.sheetName,
                        mqttSettings: data.mqttSettings
                    }
                }
            };
            await saveIntegrationConnector(newConnector);
            loadConnectors();
        } catch (error) {
            alert('Failed to create connector');
        }
    };

    const handleSaveConnector = async (connector) => {
        try {
            await saveIntegrationConnector(connector);
            loadConnectors();
            alert('Connector saved successfully!');
        } catch (error) {
            alert('Failed to save connector');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this connector?')) return;
        try {
            await deleteIntegrationConnector(id);
            setSelectedConnector(null);
            loadConnectors();
        } catch (error) {
            alert('Failed to delete connector');
        }
    };

    const addFunction = () => {
        if (!selectedConnector) return;
        const name = prompt('Function name:');
        if (!name) return;
        const fns = [...(selectedConnector.functions || []), { 
            id: `fn_${Date.now()}`, 
            name, 
            path: '/', 
            method: 'GET',
            inputs: [],
            outputs: []
        }];
        const updated = { ...selectedConnector, functions: fns };
        setSelectedConnector(updated);
        handleSaveConnector(updated);
    };

    const getConnectorIcon = (type) => {
        switch (type) {
            case 'HTTP': return <Globe size={24} />;
            case 'SQL': return <Database size={24} />;
            case 'MQTT': return <Zap size={24} />;
            case 'SUPABASE': return <HardDrive size={24} />; // Using HardDrive for Supabase
            default: return <Link2 size={24} />;
        }
    };

    if (selectedConnector) {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
                {/* Detail Header */}
                <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button onClick={() => setSelectedConnector(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '8px', borderRadius: '50%' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                            <ArrowLeft size={20} />
                        </button>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                            {getConnectorIcon(selectedConnector.type)}
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{selectedConnector.name}</h2>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>{selectedConnector.type} Connector</span>
                                <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#cbd5e1' }}></span>
                                <span>{selectedConnector.host}</span>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '3px' }}>
                            <button 
                                onClick={() => setActiveEnv('dev')}
                                style={{ padding: '6px 16px', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', backgroundColor: activeEnv === 'dev' ? 'white' : 'transparent', color: activeEnv === 'dev' ? '#001e3c' : '#64748b', boxShadow: activeEnv === 'dev' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                            >Development</button>
                            <button 
                                onClick={() => setActiveEnv('prod')}
                                style={{ padding: '6px 16px', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', backgroundColor: activeEnv === 'prod' ? 'white' : 'transparent', color: activeEnv === 'prod' ? '#001e3c' : '#64748b', boxShadow: activeEnv === 'prod' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                            >Production</button>
                        </div>
                        <button onClick={() => handleSaveConnector(selectedConnector)} style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Save size={18} /> Save
                        </button>
                        <button onClick={() => handleDelete(selectedConnector.id)} style={{ padding: '10px 12px', color: '#ef4444', border: '1px solid #fee2e2', backgroundColor: 'transparent', borderRadius: '8px', cursor: 'pointer' }}>
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>

                {/* Detail Content */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    {/* Sidebar Tabs */}
                    <div style={{ width: '240px', backgroundColor: 'white', borderRight: '1px solid #e2e8f0', padding: '20px 0' }}>
                        {[
                            { id: 'functions', icon: Code, label: 'Functions' },
                            { id: 'config', icon: Settings2, label: 'Configuration' },
                            { id: 'status', icon: Activity, label: 'Offline Status' },
                            { id: 'auth', icon: ShieldCheck, label: 'Authentication' }
                        ].map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px 24px',
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                    color: activeTab === tab.id ? '#3b82f6' : '#64748b',
                                    fontWeight: activeTab === tab.id ? 700 : 500,
                                    borderLeft: activeTab === tab.id ? '4px solid #3b82f6' : '4px solid transparent',
                                    backgroundColor: activeTab === tab.id ? '#eff6ff' : 'transparent'
                                }}
                            >
                                <tab.icon size={18} /> {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Main Workspace */}
                    <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
                        {activeTab === 'functions' && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Connector Functions</h3>
                                    <button onClick={addFunction} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', background: 'none', border: '1px solid #10b981', padding: '6px 12px', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                                        <Plus size={16} /> Add Function
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {(selectedConnector.functions || []).length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '40px', border: '2px dashed #e2e8f0', borderRadius: '12px', color: '#94a3b8' }}>
                                            <Code size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
                                            <p>No functions created yet. Functions allow you to perform specific queries.</p>
                                        </div>
                                    ) : (
                                        selectedConnector.functions.map(fn => (
                                            <div key={fn.id} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                                                    <div>
                                                        <div style={{ fontWeight: 700, color: '#1e293b' }}>{fn.name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{fn.method} {fn.path}</div>
                                                    </div>
                                                </div>
                                                <button style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><chevronRight size={18} /></button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'config' && (
                            <div style={{ maxWidth: '600px' }}>
                                <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: 800 }}>Configuration ({activeEnv.toUpperCase()})</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Running On</label>
                                        <select 
                                            value={selectedConnector.host}
                                            onChange={(e) => setSelectedConnector({...selectedConnector, host: e.target.value})}
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}
                                        >
                                            <option>Cloud Connector Host</option>
                                            <option>On-Premise Host A</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Base URL / Connection String</label>
                                        <input 
                                            type="text" 
                                            placeholder="https://api.example.com"
                                            value={selectedConnector.environments?.[activeEnv]?.baseUrl || ''}
                                            onChange={(e) => {
                                                const envs = { ...selectedConnector.environments };
                                                if (!envs[activeEnv]) envs[activeEnv] = { baseUrl: '' };
                                                envs[activeEnv].baseUrl = e.target.value;
                                                setSelectedConnector({ ...selectedConnector, environments: envs });
                                            }}
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                                        />
                                    </div>
                                    {selectedConnector.type === 'SQL' && (
                                        <>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Database Name</label>
                                                <input 
                                                    type="text" 
                                                    value={selectedConnector.databaseName || ''}
                                                    onChange={(e) => setSelectedConnector({ ...selectedConnector, databaseName: e.target.value })}
                                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                                                />
                                            </div>
                                            <div style={{ display: 'flex', gap: '16px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Username</label>
                                                    <input 
                                                        type="text" 
                                                        value={selectedConnector.username || ''}
                                                        onChange={(e) => setSelectedConnector({ ...selectedConnector, username: e.target.value })}
                                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                                                    />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Password</label>
                                                    <input 
                                                        type="password" 
                                                        value={selectedConnector.password || ''}
                                                        onChange={(e) => setSelectedConnector({ ...selectedConnector, password: e.target.value })}
                                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    {selectedConnector.type === 'SUPABASE' && (
                                        <>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Project URL</label>
                                                <input 
                                                    type="text" 
                                                    value={selectedConnector.supabaseUrl || ''}
                                                    onChange={(e) => setSelectedConnector({ ...selectedConnector, supabaseUrl: e.target.value })}
                                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>API Key</label>
                                                <input 
                                                    type="password" 
                                                    value={selectedConnector.supabaseKey || ''}
                                                    onChange={(e) => setSelectedConnector({ ...selectedConnector, supabaseKey: e.target.value })}
                                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                                                />
                                            </div>
                                        </>
                                    )}
                                    {selectedConnector.type === 'GOOGLE_SHEETS' && (
                                        <>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Spreadsheet ID</label>
                                                <input 
                                                    type="text" 
                                                    value={selectedConnector.spreadsheetId || ''}
                                                    onChange={(e) => setSelectedConnector({ ...selectedConnector, spreadsheetId: e.target.value })}
                                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Sheet Name</label>
                                                <input 
                                                    type="text" 
                                                    value={selectedConnector.sheetName || ''}
                                                    onChange={(e) => setSelectedConnector({ ...selectedConnector, sheetName: e.target.value })}
                                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                                                />
                                            </div>
                                        </>
                                    )}
                                    {selectedConnector.type === 'MQTT' && (
                                        <>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                <div>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Protocol</label>
                                                    <select 
                                                        value={selectedConnector.mqttSettings?.protocol || 'MQTT'}
                                                        onChange={(e) => setSelectedConnector({
                                                            ...selectedConnector,
                                                            mqttSettings: { ...selectedConnector.mqttSettings, protocol: e.target.value }
                                                        })}
                                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}
                                                    >
                                                        <option>MQTT</option>
                                                        <option>MQTTs</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Version</label>
                                                    <select 
                                                        value={selectedConnector.mqttSettings?.version || '5.0'}
                                                        onChange={(e) => setSelectedConnector({
                                                            ...selectedConnector,
                                                            mqttSettings: { ...selectedConnector.mqttSettings, version: e.target.value }
                                                        })}
                                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}
                                                    >
                                                        <option>3.1.1</option>
                                                        <option>5.0</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Client ID</label>
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <input 
                                                        type="text" 
                                                        value={selectedConnector.mqttSettings?.clientId || ''}
                                                        onChange={(e) => setSelectedConnector({
                                                            ...selectedConnector,
                                                            mqttSettings: { ...selectedConnector.mqttSettings, clientId: e.target.value, autoGenerateClientId: false }
                                                        })}
                                                        placeholder={selectedConnector.mqttSettings?.autoGenerateClientId ? "Auto-generated" : "Enter Client ID"}
                                                        disabled={selectedConnector.mqttSettings?.autoGenerateClientId}
                                                        style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: selectedConnector.mqttSettings?.autoGenerateClientId ? '#f8fafc' : 'white' }} 
                                                    />
                                                    <button 
                                                        onClick={() => setSelectedConnector({
                                                            ...selectedConnector,
                                                            mqttSettings: { ...selectedConnector.mqttSettings, autoGenerateClientId: !selectedConnector.mqttSettings?.autoGenerateClientId, clientId: '' }
                                                        })}
                                                        style={{ padding: '0 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: selectedConnector.mqttSettings?.autoGenerateClientId ? '#eff6ff' : 'white', color: selectedConnector.mqttSettings?.autoGenerateClientId ? '#3b82f6' : '#64748b', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                                    >
                                                        Auto-generate
                                                    </button>
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                <div>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Keep Alive (sec)</label>
                                                    <input 
                                                        type="number" 
                                                        value={selectedConnector.mqttSettings?.keepAlive || 60}
                                                        onChange={(e) => setSelectedConnector({
                                                            ...selectedConnector,
                                                            mqttSettings: { ...selectedConnector.mqttSettings, keepAlive: parseInt(e.target.value) }
                                                        })}
                                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Clean Session</label>
                                                    <div 
                                                        onClick={() => setSelectedConnector({
                                                            ...selectedConnector,
                                                            mqttSettings: { ...selectedConnector.mqttSettings, cleanSession: !selectedConnector.mqttSettings?.cleanSession }
                                                        })}
                                                        style={{ 
                                                            width: '36px', height: '18px', borderRadius: '10px', 
                                                            backgroundColor: selectedConnector.mqttSettings?.cleanSession ? '#3b82f6' : '#cbd5e1', 
                                                            position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s', marginTop: '10px'
                                                        }}
                                                    >
                                                        <div style={{ 
                                                            width: '14px', height: '14px', borderRadius: '50%', backgroundColor: 'white', 
                                                            position: 'absolute', top: '2px', left: selectedConnector.mqttSettings?.cleanSession ? '20px' : '2px',
                                                            transition: 'left 0.2s'
                                                        }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                            {selectedConnector.mqttSettings?.protocol === 'MQTTs' && (
                                                <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                    <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800 }}>MQTTs Security</h4>
                                                    <div>
                                                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '4px', display: 'block' }}>Private Key (PEM)</label>
                                                        <textarea 
                                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontFamily: 'monospace', fontSize: '0.75rem', minHeight: '60px' }}
                                                            value={selectedConnector.mqttSettings?.security?.privateKey || ''}
                                                            onChange={(e) => setSelectedConnector({
                                                                ...selectedConnector,
                                                                mqttSettings: { ...selectedConnector.mqttSettings, security: { ...selectedConnector.mqttSettings.security, privateKey: e.target.value } }
                                                            })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '4px', display: 'block' }}>Certificate (PEM)</label>
                                                        <textarea 
                                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontFamily: 'monospace', fontSize: '0.75rem', minHeight: '60px' }}
                                                            value={selectedConnector.mqttSettings?.security?.cert || ''}
                                                            onChange={(e) => setSelectedConnector({
                                                                ...selectedConnector,
                                                                mqttSettings: { ...selectedConnector.mqttSettings, security: { ...selectedConnector.mqttSettings.security, cert: e.target.value } }
                                                            })}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    <div style={{ padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #dcfce7', display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <AlertCircle size={20} color="#10b981" />
                                        <div style={{ fontSize: '0.85rem', color: '#166534' }}>
                                            <strong>{selectedConnector.type === 'SQL' || selectedConnector.type === 'SUPABASE' ? 'SSL' : 'TLS'} Enabled:</strong> This host will use {selectedConnector.type === 'SQL' || selectedConnector.type === 'SUPABASE' ? 'SSL' : 'TLS'} for secure communication by default.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '30px', backgroundColor: '#f8fafc', minHeight: '100%', color: '#1e293b', position: 'relative' }}>
            <CreateConnectorModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
                onSave={handleCreateConnector}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 900, margin: 0, color: '#001e3c' }}>Connectors</h1>
                    <p style={{ color: '#64748b', marginTop: '5px' }}>Configure integrations with ERP, WMS, and other external systems.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <Plus size={20} /> Create Connector
                </button>
            </div>

            <div style={{ marginBottom: '24px', display: 'flex', gap: '15px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Search connectors..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none' }}
                    />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {loading ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading connectors...</div>
                ) : connectors.length === 0 ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '16px', border: '1px dashed #e2e8f0' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#f0fdf4', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <Link2 size={32} />
                        </div>
                        <h3 style={{ margin: '0 0 10px 0' }}>No Connectors Configured</h3>
                        <p style={{ color: '#64748b', margin: '0 0 20px 0' }}>Integrate your MES with external APIs, SQL databases, or machines.</p>
                        <button onClick={() => setIsCreateModalOpen(true)} style={{ color: '#10b981', background: 'none', border: '1px solid #10b981', padding: '8px 16px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>Create your first connector</button>
                    </div>
                ) : connectors.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map((connector) => (
                    <div key={connector.id} 
                        onClick={() => setSelectedConnector(connector)}
                        style={{ 
                            backgroundColor: 'white', 
                            borderRadius: '16px', 
                            padding: '24px', 
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.05)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.02)'; }}
                    >
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: connector.type === 'HTTP' ? '#3b82f6' : connector.type === 'SQL' ? '#10b981' : '#f59e0b' }}></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <div style={{ 
                                width: '48px', height: '48px', borderRadius: '12px', 
                                backgroundColor: connector.type === 'HTTP' ? '#eff6ff' : connector.type === 'SQL' ? '#ecfdf5' : '#fffbeb', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                color: connector.type === 'HTTP' ? '#3b82f6' : connector.type === 'SQL' ? '#10b981' : '#f59e0b' 
                            }}>
                                {getConnectorIcon(connector.type)}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 700, color: '#10b981', backgroundColor: '#ecfdf5', padding: '4px 10px', borderRadius: '20px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                                ONLINE
                            </div>
                        </div>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>{connector.name}</h3>
                        <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Cloud size={14} /> {connector.host}
                        </p>
                        <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: '#94a3b8', height: '2.4em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {connector.description || 'No description provided.'}
                        </p>
                        
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>{connector.functions?.length || 0} FUNCTIONS</span>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>{connector.type}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid #f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#3b82f6', fontSize: '0.75rem', fontWeight: 800 }}>
                                VIEW DETAILS <ChevronRight size={14} />
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Updated {new Date(connector.updatedAt).toLocaleDateString()}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ConnectorManager;
