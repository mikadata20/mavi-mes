import React, { useState, useEffect } from 'react';
import { 
    X, Plus, Trash2, Cpu, Database, Zap, 
    ChevronRight, Info, AlertTriangle, Save
} from 'lucide-react';
import { getIntegrationConnectors, saveMachine } from '../utils/database';

const MachineTagMapper = ({ isOpen, onClose, machine, onSave }) => {
    const [connectors, setConnectors] = useState([]);
    const [mappings, setMappings] = useState(machine?.tagMappings || []);
    const [activeTab, setActiveTab] = useState('live-attributes');

    useEffect(() => {
        if (isOpen) {
            loadConnectors();
            setMappings(machine?.tagMappings || []);
        }
    }, [isOpen, machine]);

    const loadConnectors = async () => {
        const all = await getIntegrationConnectors();
        // Filter those capable of machine data
        setConnectors(all.filter(c => ['MQTT', 'OPC_UA', 'MODBUS'].includes(c.type)));
    };

    const addMapping = () => {
        setMappings([...mappings, { 
            id: Date.now(),
            attribute: '', 
            connectorId: '', 
            tag: '', 
            dataType: 'number',
            scaling: 1 
        }]);
    };

    const removeMapping = (id) => {
        setMappings(mappings.filter(m => m.id !== id));
    };

    const updateMapping = (id, part) => {
        setMappings(mappings.map(m => m.id === id ? { ...m, ...part } : m));
    };

    const handleSave = async () => {
        const updatedMachine = {
            ...machine,
            tagMappings: mappings,
            // Sync attributes for legacy display logic
            attributes: mappings.map(m => ({
                name: m.attribute,
                value: 'Waiting...',
                status: 'OK'
            }))
        };
        await saveMachine(updatedMachine);
        onSave(updatedMachine);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, backdropFilter: 'blur(4px)' }}>
            <div style={{ width: '850px', backgroundColor: 'white', borderRadius: '16px', display: 'flex', flexDirection: 'column', height: '80vh', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
                
                {/* Header */}
                <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Zap size={24} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>Data Mapping: {machine?.name}</h2>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Map PLC tags and MQTT topics to machine attributes</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '8px', borderRadius: '50%', transition: 'background-color 0.2s' }}><X size={24} /></button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    {/* Left Sidebar Info */}
                    <div style={{ width: '240px', borderRight: '1px solid #e2e8f0', padding: '24px', backgroundColor: '#f8fafc' }}>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Machine Info</label>
                            <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{machine?.type}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Station: {machine?.stationId || 'Internal'}</div>
                            </div>
                        </div>

                        <div style={{ padding: '16px', backgroundColor: '#eff6ff', borderRadius: '12px', border: '1px solid #dbeafe', color: '#1e40af' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <Info size={16} />
                                <span style={{ fontWeight: 800, fontSize: '0.8rem' }}>Tag Formats</span>
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <li><b>MQTT</b>: topic/name</li>
                                <li><b>OPC-UA</b>: ns=2;s=Speed</li>
                                <li><b>Modbus</b>: 40001 (Address)</li>
                            </ul>
                        </div>
                    </div>

                    {/* Main Mapper Area */}
                    <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Attribute Mappings</h3>
                            <button 
                                onClick={addMapping}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                            >
                                <Plus size={16} /> Add Mapping
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {mappings.length === 0 ? (
                                <div style={{ padding: '60px', textAlign: 'center', border: '2px dashed #e2e8f0', borderRadius: '12px', color: '#94a3b8' }}>
                                    <Database size={40} style={{ marginBottom: '16px', opacity: 0.5 }} />
                                    <div style={{ fontWeight: 700 }}>No active mappings</div>
                                    <div style={{ fontSize: '0.85rem' }}>Start by adding a live attribute mapping.</div>
                                </div>
                            ) : mappings.map(m => {
                                const activeConn = connectors.find(c => c.id === m.connectorId);
                                return (
                                    <div key={m.id} style={{ display: 'flex', gap: '12px', padding: '16px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', alignItems: 'center' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Attribute Name</label>
                                            <input 
                                                value={m.attribute}
                                                placeholder="e.g. Temperature"
                                                onChange={e => updateMapping(m.id, { attribute: e.target.value })}
                                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Source Connector</label>
                                            <select 
                                                value={m.connectorId}
                                                onChange={e => updateMapping(m.id, { connectorId: e.target.value })}
                                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.85rem', backgroundColor: 'white' }}
                                            >
                                                <option value="">Select Data Source</option>
                                                {connectors.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Tag / Address</label>
                                            <input 
                                                value={m.tag}
                                                placeholder={activeConn?.type === 'OPC_UA' ? 'ns=...;s=...' : 'Tag Name'}
                                                onChange={e => updateMapping(m.id, { tag: e.target.value })}
                                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                                            />
                                        </div>
                                        <button 
                                            onClick={() => removeMapping(m.id)}
                                            style={{ marginTop: '18px', padding: '8px', color: '#ef4444', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: '#f8fafc' }}>
                    <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                    <button 
                        onClick={handleSave}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '8px', backgroundColor: '#3b82f6', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                    >
                        <Save size={18} /> Save Mappings
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MachineTagMapper;
