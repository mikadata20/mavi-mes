import React, { useState, useEffect } from 'react';
import { 
    Layout, 
    Plus, 
    Search, 
    MoreVertical, 
    Monitor, 
    Cpu, 
    Activity, 
    Globe, 
    ArrowRight,
    MapPin,
    Calendar,
    Settings,
    Trash2,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Layers
} from 'lucide-react';
import { getStations, saveStation, deleteStation, getInterfaces } from '../utils/database';

const StationManager = () => {
    const [stations, setStations] = useState([]);
    const [interfaces, setInterfaces] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedStation, setSelectedStation] = useState(null);
    const [newStationData, setNewStationData] = useState({
        name: '',
        description: '',
        group: 'Default Group',
        status: 'READY'
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [s, i] = await Promise.all([getStations(), getInterfaces()]);
        setStations(s);
        setInterfaces(i);
    };

    const handleCreateStation = async () => {
        if (!newStationData.name) return;
        
        const station = {
            ...newStationData,
            interfaceId: null,
            assignedApps: [],
            devices: [],
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            lastEvent: 'Station Created'
        };
        
        await saveStation(station);
        setIsCreateModalOpen(false);
        setNewStationData({ name: '', description: '', group: 'Default Group', status: 'READY' });
        loadData();
    };

    const handleDeleteStation = async (id) => {
        if (window.confirm('Are you sure you want to delete this station?')) {
            await deleteStation(id);
            if (selectedStation?.id === id) setSelectedStation(null);
            loadData();
        }
    };

    const filteredStations = stations.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.group?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status) => {
        const styles = {
            'READY': { bg: '#f1f5f9', color: '#475569', icon: <CheckCircle2 size={14} /> },
            'RUNNING': { bg: '#dcfce7', color: '#166534', icon: <Activity size={14} /> },
            'DOWN': { bg: '#fee2e2', color: '#991b1b', icon: <AlertCircle size={14} /> },
            'OFFLINE': { bg: '#f1f5f9', color: '#94a3b8', icon: <XCircle size={14} /> }
        };
        const style = styles[status] || styles['OFFLINE'];
        return (
            <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '6px', 
                padding: '4px 10px', 
                borderRadius: '20px', 
                backgroundColor: style.bg, 
                color: style.color, 
                fontSize: '0.7rem', 
                fontWeight: 800 
            }}>
                {style.icon} {status}
            </span>
        );
    };

    return (
        <div style={{ height: '100%', display: 'flex', backgroundColor: 'var(--bg-primary)' }}>
            {/* Sidebar / List */}
            <div style={{ 
                width: selectedStation ? '400px' : '100%', 
                borderRight: '1px solid var(--border-color)', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'width 0.3s ease'
            }}>
                <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>Stations</h2>
                        <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '8px', 
                                padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', 
                                border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' 
                            }}
                        >
                            <Plus size={16} /> Create Station
                        </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
                        <input 
                            type="text" 
                            placeholder="Search stations..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ 
                                width: '100%', padding: '10px 10px 10px 40px', 
                                borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' 
                            }} 
                        />
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                    {filteredStations.map(station => (
                        <div 
                            key={station.id}
                            onClick={() => setSelectedStation(station)}
                            style={{ 
                                padding: '16px', borderRadius: '12px', marginBottom: '12px', cursor: 'pointer',
                                backgroundColor: selectedStation?.id === station.id ? '#eff6ff' : 'white',
                                border: selectedStation?.id === station.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{station.name}</span>
                                {getStatusBadge(station.status)}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{station.group}</div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#94a3b8' }}>
                                    <Monitor size={14} /> {station.interfaceId ? '1 Interface' : 'No Interface'}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#94a3b8' }}>
                                    <Layers size={14} /> {station.assignedApps?.length || 0} Apps
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredStations.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                            No stations found.
                        </div>
                    )}
                </div>
            </div>

            {/* Detail View */}
            {selectedStation && (
                <div style={{ flex: 1, backgroundColor: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#f0f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <MapPin size={24} color="#3b82f6" />
                            </div>
                            <div>
                                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)' }}>{selectedStation.name}</h1>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                    <span>{selectedStation.group}</span>
                                    <span>•</span>
                                    <span>Updated {new Date(selectedStation.updatedAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button 
                                onClick={() => handleDeleteStation(selectedStation.id)}
                                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #fee2e2', color: '#ef4444', backgroundColor: 'transparent', cursor: 'pointer' }}
                            >
                                <Trash2 size={18} />
                            </button>
                            <button 
                                onClick={() => setSelectedStation(null)}
                                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                            {/* App Assignments */}
                            <div style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
                                <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Layout size={18} color="#3b82f6" /> App Assignments
                                </h3>
                                {selectedStation.assignedApps?.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {selectedStation.assignedApps.map((app, idx) => (
                                            <div key={idx} style={{ padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ fontWeight: 600 }}>{app.name}</span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>v{app.version}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '0.85rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                                        No apps assigned to this station.
                                    </div>
                                )}
                                <button style={{ width: '100%', marginTop: '20px', padding: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid #3b82f6', color: '#3b82f6', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                                    Edit Assignments
                                </button>
                            </div>

                            {/* Linked Devices */}
                            <div style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
                                <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Monitor size={18} color="#3b82f6" /> Interface & Devices
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Active Interface</div>
                                        {selectedStation.interfaceId ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <Monitor size={20} color="#10b981" />
                                                <div>
                                                    <div style={{ fontWeight: 700 }}>MacBook Pro - Floor 1</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#10b981' }}>Online • Player v2.84</div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                                                <Monitor size={20} />
                                                <span style={{ fontSize: '0.85rem' }}>No interface assigned</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button style={{ width: '100%', marginTop: '20px', padding: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid #3b82f6', color: '#3b82f6', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                                    Manage Devices
                                </button>
                            </div>
                        </div>

                        {/* Recent Events */}
                        <div style={{ marginTop: '32px' }}>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>Recent Events</h3>
                            <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead style={{ backgroundColor: 'var(--bg-primary)' }}>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: '12px 20px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>Timestamp</th>
                                            <th style={{ textAlign: 'left', padding: '12px 20px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>Event</th>
                                            <th style={{ textAlign: 'left', padding: '12px 20px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>Details</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9' }}>{new Date().toLocaleString()}</td>
                                            <td style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                                <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', fontWeight: 700 }}>STATUS_CHANGE</span>
                                            </td>
                                            <td style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9' }}>Station set to {selectedStation.status}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!selectedStation && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '24px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <MapPin size={32} color="#cbd5e1" />
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Select a station to view details</div>
                </div>
            )}

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div style={{ backgroundColor: 'var(--bg-secondary)', width: '500px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Create New Station</h2>
                            <button onClick={() => setIsCreateModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><XCircle size={20} color="#94a3b8" /></button>
                        </div>
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Station Name</label>
                                <input 
                                    type="text" 
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                    placeholder="e.g. Assembly Line A - Station 1"
                                    value={newStationData.name}
                                    onChange={(e) => setNewStationData({ ...newStationData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Group / Location</label>
                                <select 
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
                                    value={newStationData.group}
                                    onChange={(e) => setNewStationData({ ...newStationData, group: e.target.value })}
                                >
                                    <option>Default Group</option>
                                    <option>Assembly Floor</option>
                                    <option>Testing Lab</option>
                                    <option>Packaging area</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Description</label>
                                <textarea 
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', minHeight: '80px', fontFamily: 'inherit' }}
                                    placeholder="Brief details about this workspace..."
                                    value={newStationData.description}
                                    onChange={(e) => setNewStationData({ ...newStationData, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <div style={{ padding: '24px', backgroundColor: 'var(--bg-primary)', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button 
                                onClick={() => setIsCreateModalOpen(false)}
                                style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleCreateStation}
                                style={{ padding: '10px 24px', borderRadius: '8px', backgroundColor: '#3b82f6', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Create Station
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StationManager;
