import React, { useState, useEffect } from 'react';
import {
    Cpu,
    Plus,
    Search,
    Settings,
    Database,
    Zap,
    Layers,
    Trash2,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Activity
} from 'lucide-react';
import { 
    getMachines, saveMachine, deleteMachine, getStations, 
    getIntegrationConnectors, saveIntegrationConnector, deleteIntegrationConnector,
    getEdgeDevices, saveEdgeDevice, deleteEdgeDevice
} from '../utils/database';
import CreateConnectorModal from './CreateConnectorModal';
import MachineTagMapper from './MachineTagMapper';

const MachineManager = () => {
    const [machines, setMachines] = useState([]);
    const [stations, setStations] = useState([]);
    const [connectors, setConnectors] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMachine, setSelectedMachine] = useState(null);
    const [view, setView] = useState('machines'); // 'machines' | 'data-sources' | 'connector-hosts'
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreateDataSourceModalOpen, setIsCreateDataSourceModalOpen] = useState(false);
    const [isTagMapperOpen, setIsTagMapperOpen] = useState(false);
    const [mappingMachine, setMappingMachine] = useState(null);
    const [edgeDevices, setEdgeDevices] = useState([]);
    const [newMachineData, setNewMachineData] = useState({
        name: '',
        type: 'CNC Mill',
        dataSource: 'OPC UA',
        stationId: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [m, s, c, e] = await Promise.all([
            getMachines(), 
            getStations(), 
            getIntegrationConnectors(),
            getEdgeDevices()
        ]);
        setMachines(m);
        setStations(s);
        setConnectors(c.filter(conn => ['MQTT', 'OPC_UA', 'MODBUS'].includes(conn.type)));
        setEdgeDevices(e);
    };

    const handleCreateDataSource = async (data) => {
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
            loadData();
        } catch (error) {
            alert('Failed to create data source');
        }
    };

    const handleCreateMachine = async () => {
        if (!newMachineData.name) return;

        const machine = {
            ...newMachineData,
            status: 'CONNECTED',
            lastData: new Date().toISOString(),
            attributes: [
                { name: 'Spindle Speed', value: '12000 RPM', status: 'OK' },
                { name: 'Temperature', value: '45°C', status: 'WARNING' }
            ]
        };

        await saveMachine(machine);
        setIsCreateModalOpen(false);
        setNewMachineData({ name: '', type: 'CNC Mill', dataSource: 'OPC UA', stationId: '' });
        loadData();
    };

    const handleDeleteMachine = async (id) => {
        if (window.confirm('Are you sure you want to remove this machine connection?')) {
            await deleteMachine(id);
            if (selectedMachine?.id === id) setSelectedMachine(null);
            loadData();
        }
    };

    const filteredMachines = machines.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', backgroundColor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>Machines</h2>
                    <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>Connect and monitor physical equipment</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white',
                        border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer'
                    }}
                >
                    <Plus size={18} /> Connect Machine
                </button>
            </div>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Side Navigation */}
                <div style={{ width: '240px', backgroundColor: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '24px 0' }}>
                    <div style={{ padding: '0 24px 16px 24px', fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>Machine Monitoring</div>
                    <button
                        onClick={() => setView('machines')}
                        style={{
                            padding: '12px 24px', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer',
                            fontSize: '0.85rem', fontWeight: 600, color: view === 'machines' ? '#3b82f6' : '#64748b',
                            backgroundColor: view === 'machines' ? '#eff6ff' : 'transparent', borderLeft: view === 'machines' ? '4px solid #3b82f6' : '4px solid transparent'
                        }}
                    >Machines</button>
                    <div style={{ padding: '16px 24px 8px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Library</div>
                    <button style={{ padding: '10px 24px', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Types</button>
                    <button style={{ padding: '10px 44px', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, color: '#64748b' }}>Attributes</button>
                    <button style={{ padding: '10px 44px', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, color: '#64748b' }}>Activity Fields</button>
                    <button style={{ padding: '10px 44px', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, color: '#64748b' }}>Downtime Reasons</button>
                    <button style={{ padding: '10px 44px', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, color: '#64748b' }}>States</button>
                    <button
                        onClick={() => setView('connector-hosts')}
                        style={{
                            padding: '12px 24px', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer',
                            fontSize: '0.85rem', fontWeight: 600, color: view === 'connector-hosts' ? '#3b82f6' : '#64748b',
                            backgroundColor: view === 'connector-hosts' ? '#eff6ff' : 'transparent', borderLeft: view === 'connector-hosts' ? '4px solid #3b82f6' : '4px solid transparent', marginTop: '8px'
                        }}
                    >Connector Hosts</button>
                    <button
                        onClick={() => setView('data-sources')}
                        style={{
                            padding: '12px 24px', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer',
                            fontSize: '0.85rem', fontWeight: 600, color: view === 'data-sources' ? '#3b82f6' : '#64748b',
                            backgroundColor: view === 'data-sources' ? '#eff6ff' : 'transparent', borderLeft: view === 'data-sources' ? '4px solid #3b82f6' : '4px solid transparent'
                        }}
                    >Data Sources</button>
                </div>

                {/* Main Workspace */}
                <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                    {view === 'machines' ? (
                        <>
                            <div style={{ position: 'relative', maxWidth: '400px', marginBottom: '32px' }}>
                                <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
                                <input
                                    type="text"
                                    placeholder="Search machines..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        width: '100%', padding: '12px 12px 12px 40px',
                                        borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: 'white'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '24px' }}>
                                {filteredMachines.map(machine => {
                                    const station = stations.find(s => s.id === machine.stationId);
                                    return (
                                        <div key={machine.id} style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                            <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'white', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                                        <Cpu size={20} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 800, color: '#1e293b' }}>{machine.name}</div>
                                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>{machine.type}</div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 10px', borderRadius: '20px', backgroundColor: '#dcfce7', color: '#166534', fontSize: '0.7rem', fontWeight: 800 }}>
                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#166534' }} />
                                                    CONNECTED
                                                </div>
                                            </div>
                                            <div style={{ padding: '20px' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                                                    <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Data Source</div>
                                                        <div style={{ fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <Database size={14} color="#3b82f6" /> {machine.dataSource}
                                                        </div>
                                                    </div>
                                                    <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Station</div>
                                                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{station ? station.name : 'Unassigned'}</div>
                                                    </div>
                                                </div>

                                                <div style={{ marginBottom: '20px' }}>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '12px' }}>Live Attributes</div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        {machine.attributes?.map((attr, idx) => (
                                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                                                <span style={{ color: '#475569' }}>{attr.name}</span>
                                                                <span style={{ fontWeight: 700, color: attr.status === 'WARNING' ? '#f59e0b' : '#1e293b' }}>{attr.value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', gap: '12px' }}>
                                                    <button 
                                                        onClick={() => { setMappingMachine(machine); setIsTagMapperOpen(true); }}
                                                        style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#eff6ff', color: '#3b82f6', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                                                    >
                                                        Configure Tags
                                                    </button>
                                                    <button style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', color: '#ef4444' }} onClick={() => handleDeleteMachine(machine.id)}>Disconnect</button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {filteredMachines.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '80px', backgroundColor: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                                    <Cpu size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                                    <h3 style={{ margin: 0, color: '#1e293b' }}>No machines connected</h3>
                                    <p style={{ color: '#64748b', maxWidth: '300px', margin: '8px auto' }}>Connect to your CNCs, PLCs, or sensors to start capturing live data.</p>
                                    <button
                                        onClick={() => setIsCreateModalOpen(true)}
                                        style={{ marginTop: '16px', padding: '10px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Establish Connection
                                    </button>
                                </div>
                            )}
                        </>
                    ) : view === 'connector-hosts' ? (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Connector Hosts</h3>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Manage edge devices and local connectivity points</p>
                                </div>
                                <button
                                    onClick={async () => {
                                        await saveEdgeDevice({ name: `Edge IO-${Math.floor(Math.random()*10000)}`, status: 'ONLINE', version: '2.4.1' });
                                        loadData();
                                    }}
                                    style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    + Register Edge IO
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                                {edgeDevices.length === 0 ? (
                                    <div style={{ gridColumn: '1/-1', padding: '60px', textAlign: 'center', backgroundColor: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                                        <Layers size={40} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                                        <div style={{ fontWeight: 700, color: '#64748b' }}>No Connector Hosts found</div>
                                    </div>
                                ) : edgeDevices.map(host => (
                                    <div key={host.id} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                                    <Layers size={20} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{host.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>v{host.version || '1.0.0'}</div>
                                                </div>
                                            </div>
                                            <div style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#166534', fontSize: '0.65rem', fontWeight: 800 }}>ONLINE</div>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Serial Number</span>
                                                <span style={{ fontWeight: 600 }}>{host.id.split('_').pop()}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>IP Address</span>
                                                <span style={{ fontWeight: 600 }}>192.168.1.{Math.floor(Math.random()*255)}</span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={async () => { await deleteEdgeDevice(host.id); loadData(); }}
                                            style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                                        >
                                            Unregister Device
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Machine Data Sources</h3>
                                <button
                                    onClick={() => setIsCreateDataSourceModalOpen(true)}
                                    style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    + Create Machine Data Source
                                </button>
                            </div>

                            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                        <tr>
                                            <th style={{ padding: '12px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Type</th>
                                            <th style={{ padding: '12px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Name</th>
                                            <th style={{ padding: '12px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                                            <th style={{ padding: '12px 24px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {connectors.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No machine data sources configured.</td>
                                            </tr>
                                        ) : connectors.map(conn => (
                                            <tr key={conn.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '16px 24px', fontSize: '0.85rem', fontWeight: 700 }}>{conn.type}</td>
                                                <td style={{ padding: '16px 24px' }}>
                                                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{conn.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{conn.serverAddress || 'MQTT Broker'}</div>
                                                </td>
                                                <td style={{ padding: '16px 24px' }}>
                                                    <span style={{ padding: '4px 10px', borderRadius: '20px', backgroundColor: '#dcfce7', color: '#166534', fontSize: '0.7rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#166534' }} /> Online
                                                    </span>
                                                </td>
                                                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                                    <button style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><Settings size={18} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div style={{ backgroundColor: 'white', width: '500px', borderRadius: '16px', overflow: 'hidden' }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Connect New Machine</h2>
                            <button onClick={() => setIsCreateModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><XCircle size={20} color="#94a3b8" /></button>
                        </div>
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Machine Name</label>
                                <input
                                    type="text"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                    placeholder="e.g. Mill-01"
                                    value={newMachineData.name}
                                    onChange={(e) => setNewMachineData({ ...newMachineData, name: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Machine Type</label>
                                    <select
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}
                                        value={newMachineData.type}
                                        onChange={(e) => setNewMachineData({ ...newMachineData, type: e.target.value })}
                                    >
                                        <option>CNC Mill</option>
                                        <option>Injection Mold</option>
                                        <option>Assembly Robot</option>
                                        <option>Conveyor Belt</option>
                                        <option>Temperature Sensor</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Data Source</label>
                                    <select
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}
                                        value={newMachineData.dataSource}
                                        onChange={(e) => setNewMachineData({ ...newMachineData, dataSource: e.target.value })}
                                    >
                                        <option>OPC UA</option>
                                        <option>MQTT</option>
                                        <option>API / Webhook</option>
                                        <option>Edge Device</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Assign to Station</label>
                                <select
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}
                                    value={newMachineData.stationId}
                                    onChange={(e) => setNewMachineData({ ...newMachineData, stationId: e.target.value })}
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
                                onClick={handleCreateMachine}
                                style={{ padding: '10px 24px', borderRadius: '8px', backgroundColor: '#3b82f6', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Connect
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Data Source Modal */}
            <CreateConnectorModal
                isOpen={isCreateDataSourceModalOpen}
                onClose={() => setIsCreateDataSourceModalOpen(false)}
                onSave={handleCreateDataSource}
            />

            <MachineTagMapper
                isOpen={isTagMapperOpen}
                machine={mappingMachine}
                onClose={() => { setIsTagMapperOpen(false); setMappingMachine(null); }}
                onSave={() => loadData()}
            />
        </div>
    );
};

export default MachineManager;
