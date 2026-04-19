import React, { useState, useEffect } from 'react';
import { 
    Monitor, 
    Plus, 
    Search, 
    RefreshCw, 
    Smartphone, 
    Tablet, 
    Laptop, 
    Trash2, 
    ExternalLink,
    CheckCircle2,
    XCircle,
    Info,
    ArrowRight
} from 'lucide-react';
import { getInterfaces, saveInterface, deleteInterface, getStations } from '../utils/database';

const InterfaceManager = () => {
    const [interfaces, setInterfaces] = useState([]);
    const [stations, setStations] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedInterface, setSelectedInterface] = useState(null);
    const [newInterfaceData, setNewInterfaceData] = useState({
        name: '',
        deviceType: 'Computer',
        stationId: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [i, s] = await Promise.all([getInterfaces(), getStations()]);
        setInterfaces(i);
        setStations(s);
    };

    const handleCreateInterface = async () => {
        if (!newInterfaceData.name) return;
        
        const iface = {
            ...newInterfaceData,
            status: 'ONLINE',
            version: 'r284.1',
            lastSeen: new Date().toISOString(),
            ipAddress: '192.168.1.' + Math.floor(Math.random() * 254 + 1)
        };
        
        await saveInterface(iface);
        setIsCreateModalOpen(false);
        setNewInterfaceData({ name: '', deviceType: 'Computer', stationId: '' });
        loadData();
    };

    const handleDeleteInterface = async (id) => {
        if (window.confirm('Are you sure you want to remove this interface?')) {
            await deleteInterface(id);
            if (selectedInterface?.id === id) setSelectedInterface(null);
            loadData();
        }
    };

    const getDeviceIcon = (type) => {
        switch(type) {
            case 'Phone': return <Smartphone size={20} />;
            case 'Tablet': return <Tablet size={20} />;
            default: return <Laptop size={20} />;
        }
    };

    const filteredInterfaces = interfaces.filter(i => 
        i.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', backgroundColor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>Interfaces</h2>
                    <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>Manage display devices running the MES Player</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        onClick={loadData}
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: 'pointer' }}
                    >
                        <RefreshCw size={18} color="#64748b" />
                    </button>
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        style={{ 
                            display: 'flex', alignItems: 'center', gap: '8px', 
                            padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', 
                            border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' 
                        }}
                    >
                        <Plus size={18} /> Register Interface
                    </button>
                </div>
            </div>

            <div style={{ padding: '24px' }}>
                <div style={{ position: 'relative', maxWidth: '400px', marginBottom: '24px' }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
                    <input 
                        type="text" 
                        placeholder="Search by name or serial..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ 
                            width: '100%', padding: '12px 12px 12px 40px', 
                            borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: 'white' 
                        }} 
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                    {filteredInterfaces.map(iface => {
                        const station = stations.find(s => s.id === iface.stationId);
                        return (
                            <div key={iface.id} style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                            {getDeviceIcon(iface.deviceType)}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 800, color: '#1e293b' }}>{iface.name}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 700, color: '#10b981' }}>
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                                                ONLINE
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteInterface(iface.id)}
                                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div style={{ padding: '20px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                            <span style={{ color: '#64748b' }}>Assigned Station</span>
                                            <span style={{ fontWeight: 700, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {station ? station.name : 'Unassigned'} <ArrowRight size={12} />
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                            <span style={{ color: '#64748b' }}>Software Version</span>
                                            <span style={{ fontWeight: 600 }}>{iface.version}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                            <span style={{ color: '#64748b' }}>IP Address</span>
                                            <span style={{ fontWeight: 600 }}>{iface.ipAddress}</span>
                                        </div>
                                    </div>
                                    <button 
                                        style={{ width: '100%', marginTop: '20px', padding: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    >
                                        Launch Player <ExternalLink size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {filteredInterfaces.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '80px', backgroundColor: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                        <Monitor size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                        <h3 style={{ margin: 0, color: '#1e293b' }}>No interfaces registered</h3>
                        <p style={{ color: '#64748b', maxWidth: '300px', margin: '8px auto' }}>Register your first device to start running apps on the shop floor.</p>
                        <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            style={{ marginTop: '16px', padding: '10px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                        >
                            Get Started
                        </button>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div style={{ backgroundColor: 'white', width: '500px', borderRadius: '16px', overflow: 'hidden' }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Register New Interface</h2>
                            <button onClick={() => setIsCreateModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><XCircle size={20} color="#94a3b8" /></button>
                        </div>
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '12px', border: '1px solid #bae6fd', display: 'flex', gap: '12px' }}>
                                <Info size={20} color="#0284c7" />
                                <div style={{ fontSize: '0.85rem', color: '#0369a1' }}>
                                    Interfaces are display devices (tablets, PCs, phones) that run the MES Player. Each interface should be assigned to a station.
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Interface Name</label>
                                <input 
                                    type="text" 
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                    placeholder="e.g. Line 1 Tablet"
                                    value={newInterfaceData.name}
                                    onChange={(e) => setNewInterfaceData({ ...newInterfaceData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Device Type</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                    {['Computer', 'Tablet', 'Phone'].map(type => (
                                        <button 
                                            key={type}
                                            onClick={() => setNewInterfaceData({ ...newInterfaceData, deviceType: type })}
                                            style={{ 
                                                padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', 
                                                backgroundColor: newInterfaceData.deviceType === type ? '#eff6ff' : 'white',
                                                borderColor: newInterfaceData.deviceType === type ? '#3b82f6' : '#e2e8f0',
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                                                cursor: 'pointer', fontWeight: 700
                                            }}
                                        >
                                            {getDeviceIcon(type)}
                                            <span style={{ fontSize: '0.75rem' }}>{type}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Initial Station Assignment</label>
                                <select 
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}
                                    value={newInterfaceData.stationId}
                                    onChange={(e) => setNewInterfaceData({ ...newInterfaceData, stationId: e.target.value })}
                                >
                                    <option value="">Unassigned</option>
                                    {stations.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button 
                                onClick={() => setIsCreateModalOpen(false)}
                                style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleCreateInterface}
                                style={{ padding: '10px 24px', borderRadius: '8px', backgroundColor: '#3b82f6', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Register Device
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InterfaceManager;
