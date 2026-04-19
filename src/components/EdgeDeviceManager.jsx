import React, { useState, useEffect } from 'react';
import { 
    Cpu, 
    Plus, 
    Search, 
    Settings, 
    Activity, 
    Zap, 
    Trash2, 
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Info,
    ArrowRight,
    Wifi,
    HardDrive
} from 'lucide-react';
import { getEdgeDevices, saveEdgeDevice, deleteEdgeDevice } from '../utils/database';

const EdgeDeviceManager = () => {
    const [devices, setDevices] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newDeviceData, setNewDeviceData] = useState({
        name: '',
        model: 'Edge IO',
        serialNumber: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const d = await getEdgeDevices();
        setDevices(d);
    };

    const handleCreateDevice = async () => {
        if (!newDeviceData.name) return;
        
        const device = {
            ...newDeviceData,
            status: 'ONLINE',
            lastSeen: new Date().toISOString(),
            ipAddress: '192.168.1.' + Math.floor(Math.random() * 254 + 1),
            firmware: 'v5.2.1'
        };
        
        await saveEdgeDevice(device);
        setIsCreateModalOpen(false);
        setNewDeviceData({ name: '', model: 'Edge IO', serialNumber: '' });
        loadData();
    };

    const handleDeleteDevice = async (id) => {
        if (window.confirm('Are you sure you want to remove this edge device?')) {
            await deleteEdgeDevice(id);
            loadData();
        }
    };

    const filteredDevices = devices.filter(d => 
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', backgroundColor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>Edge Devices</h2>
                    <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>Manage Edge IO and Edge MC hardware</p>
                </div>
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px', 
                        padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', 
                        border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' 
                    }}
                >
                    <Plus size={18} /> Register Edge Device
                </button>
            </div>

            <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
                <div style={{ position: 'relative', maxWidth: '400px', marginBottom: '32px' }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
                    <input 
                        type="text" 
                        placeholder="Search devices..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ 
                            width: '100%', padding: '12px 12px 12px 40px', 
                            borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: 'white' 
                        }} 
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
                    {filteredDevices.map(device => (
                        <div key={device.id} style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                        <HardDrive size={20} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 800, color: '#1e293b' }}>{device.name}</div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>{device.model}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 800, color: '#10b981', backgroundColor: '#dcfce7', padding: '4px 10px', borderRadius: '20px' }}>
                                    ONLINE
                                </div>
                            </div>
                            <div style={{ padding: '20px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                        <span style={{ color: '#64748b' }}>Serial Number</span>
                                        <span style={{ fontWeight: 600 }}>{device.serialNumber || 'N/A'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                        <span style={{ color: '#64748b' }}>IP Address</span>
                                        <span style={{ fontWeight: 600 }}>{device.ipAddress}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                        <span style={{ color: '#64748b' }}>Firmware</span>
                                        <span style={{ fontWeight: 600 }}>{device.firmware}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>Configure I/O</button>
                                    <button style={{ padding: '10px', borderRadius: '8px', border: '1px solid #fee2e2', color: '#ef4444', backgroundColor: 'white', cursor: 'pointer' }} onClick={() => handleDeleteDevice(device.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredDevices.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '80px', backgroundColor: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                        <HardDrive size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                        <h3 style={{ margin: 0, color: '#1e293b' }}>No edge devices registered</h3>
                        <p style={{ color: '#64748b', maxWidth: '300px', margin: '8px auto' }}>Register your Edge IO or Edge MC to bridge the physical floor with MES.</p>
                        <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            style={{ marginTop: '16px', padding: '10px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                        >
                            Register Device
                        </button>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div style={{ backgroundColor: 'white', width: '500px', borderRadius: '16px', overflow: 'hidden' }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Register Edge Device</h2>
                            <button onClick={() => setIsCreateModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><XCircle size={20} color="#94a3b8" /></button>
                        </div>
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Display Name</label>
                                <input 
                                    type="text" 
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                    placeholder="e.g. Assembly Line Edge IO"
                                    value={newDeviceData.name}
                                    onChange={(e) => setNewDeviceData({ ...newDeviceData, name: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Model</label>
                                    <select 
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}
                                        value={newDeviceData.model}
                                        onChange={(e) => setNewDeviceData({ ...newDeviceData, model: e.target.value })}
                                    >
                                        <option>Edge IO</option>
                                        <option>Edge MC</option>
                                        <option>I/O Gateway</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Serial Number</label>
                                    <input 
                                        type="text" 
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                        placeholder="e.g. EIO-12345"
                                        value={newDeviceData.serialNumber}
                                        onChange={(e) => setNewDeviceData({ ...newDeviceData, serialNumber: e.target.value })}
                                    />
                                </div>
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
                                onClick={handleCreateDevice}
                                style={{ padding: '10px 24px', borderRadius: '8px', backgroundColor: '#3b82f6', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Register
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EdgeDeviceManager;
