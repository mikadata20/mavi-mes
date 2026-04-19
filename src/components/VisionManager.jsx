import React, { useMemo, useState } from 'react';
import {
    Eye,
    Camera,
    Plus,
    Search,
    Settings,
    Activity,
    Layers,
    Trash2,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Info,
    Play,
    Box,
    Maximize,
    X
} from 'lucide-react';

const VisionManager = () => {
    const [cameraConfigs, setCameraConfigs] = useState([
        { id: 'cam_1', name: 'Workstation 1 Top View', status: 'ACTIVE', regions: 3, detectors: ['Change Detector', 'Object Detector'] },
        { id: 'cam_2', name: 'Inspection Area Zoom', status: 'INACTIVE', regions: 1, detectors: ['OCR Detector'] }
    ]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModelInfo, setShowModelInfo] = useState(false);
    const [showCameraForm, setShowCameraForm] = useState(false);
    const [selectedCamera, setSelectedCamera] = useState(null);
    const [newCameraName, setNewCameraName] = useState('');

    const filteredConfigs = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return cameraConfigs;
        return cameraConfigs.filter((config) =>
            config.name.toLowerCase().includes(term) ||
            config.detectors.some((d) => d.toLowerCase().includes(term))
        );
    }, [cameraConfigs, searchTerm]);

    const toggleCameraStatus = (id) => {
        setCameraConfigs((prev) =>
            prev.map((cfg) =>
                cfg.id === id
                    ? { ...cfg, status: cfg.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }
                    : cfg
            )
        );
    };

    const addCameraConfig = () => {
        const name = newCameraName.trim();
        if (!name) {
            alert('Camera name is required.');
            return;
        }

        const newConfig = {
            id: `cam_${Date.now()}`,
            name,
            status: 'INACTIVE',
            regions: 1,
            detectors: ['Change Detector']
        };

        setCameraConfigs((prev) => [newConfig, ...prev]);
        setNewCameraName('');
        setShowCameraForm(false);
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', backgroundColor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>Vision</h2>
                        <span style={{ backgroundColor: '#f1f5f9', color: '#1e293b', padding: '2px 8px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 700 }}>Beta</span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>Computer vision and real-time image recognition</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                            onClick={() => setShowModelInfo((prev) => !prev)}
                            style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Box size={18} /> Manage Models
                        </button>
                        <button
                            onClick={() => setShowCameraForm(true)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white',
                                border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer'
                            }}
                        >
                            <Plus size={18} /> Camera Configuration
                        </button>
                </div>
            </div>

            {(showModelInfo || showCameraForm) && (
                <div style={{ padding: '0 24px' }}>
                    {showModelInfo && (
                        <div style={{ marginTop: '16px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a', borderRadius: '10px', padding: '12px 16px', fontSize: '0.85rem' }}>
                            Model manager connected. (Demo mode) You can still configure cameras and toggle live feeds.
                        </div>
                    )}

                    {showCameraForm && (
                        <div style={{ marginTop: '16px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <input
                                value={newCameraName}
                                onChange={(e) => setNewCameraName(e.target.value)}
                                placeholder="New camera configuration name"
                                style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            />
                            <button onClick={addCameraConfig} style={{ padding: '10px 14px', borderRadius: '8px', border: 'none', backgroundColor: '#3b82f6', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                                Save
                            </button>
                            <button onClick={() => setShowCameraForm(false)} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: 'pointer' }}>
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div style={{ flex: 1, padding: '24px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                {/* Configurations List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>Camera Configurations</h3>
                    <div style={{ position: 'relative', maxWidth: '420px' }}>
                        <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search configuration or detector..."
                            style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}
                        />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                        {filteredConfigs.map(config => (
                            <div key={config.id} style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                <div style={{ height: '180px', backgroundColor: '#0f172a', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Camera size={48} color="#334155" />
                                    <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                                        <span style={{
                                            padding: '4px 10px', borderRadius: '20px', backgroundColor: config.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9',
                                            color: config.status === 'ACTIVE' ? '#166534' : '#64748b', fontSize: '0.65rem', fontWeight: 800,
                                            border: '1px solid rgba(0,0,0,0.1)'
                                        }}>
                                            {config.status}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setSelectedCamera(config)}
                                        style={{ position: 'absolute', bottom: '12px', right: '12px', padding: '6px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', cursor: 'pointer' }}
                                    >
                                        <Maximize size={16} />
                                    </button>
                                </div>
                                <div style={{ padding: '20px' }}>
                                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b', marginBottom: '4px' }}>{config.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '16px' }}>{config.regions} monitored regions</div>

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                                        {config.detectors.map(d => (
                                            <span key={d} style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569', fontSize: '0.7rem', fontWeight: 700 }}>
                                                {d}
                                            </span>
                                        ))}
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            onClick={() => toggleCameraStatus(config.id)}
                                            style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: '#3b82f6', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                        >
                                            <Play size={14} /> LIVE VIEW
                                        </button>
                                        <button
                                            onClick={() => alert(`Settings opened for: ${config.name}`)}
                                            style={{ width: '40px', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Settings size={18} color="#64748b" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filteredConfigs.length === 0 && (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px', backgroundColor: 'white', border: '1px dashed #cbd5e1', borderRadius: '12px', color: '#64748b' }}>
                                No camera configuration matches "{searchTerm}".
                            </div>
                        )}
                    </div>
                </div>

                {/* Detectors & IP Cameras Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ padding: '24px', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800 }}>Available Detectors</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[
                                { name: 'Change Detector', desc: 'Monitors regions for visual changes' },
                                { name: 'Jig Detector', desc: 'Tracks objects with markers' },
                                { name: 'Color Detector', desc: 'Identifies colors in specified regions' },
                                { name: 'OCR Detector', desc: 'Reads text from images' }
                            ].map(d => (
                                <div key={d.name} style={{ padding: '12px', border: '1px solid #f1f5f9', borderRadius: '8px' }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{d.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{d.desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
                        <Eye size={32} color="#cbd5e1" style={{ marginBottom: '12px' }} />
                        <h4 style={{ margin: 0, fontWeight: 800 }}>IP Cameras</h4>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '8px 0 16px 0' }}>Connect network stream cameras for visual processing.</p>
                        <button
                            onClick={() => setShowCameraForm(true)}
                            style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #3b82f6', color: '#3b82f6', backgroundColor: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                            Add IP Camera
                        </button>
                    </div>
                </div>
            </div>

            {selectedCamera && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div style={{ width: 'min(900px, 92vw)', backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 30px rgba(0,0,0,0.25)' }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <strong>{selectedCamera.name} — Live Preview</strong>
                            <button onClick={() => setSelectedCamera(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                                <X size={18} />
                            </button>
                        </div>
                        <div style={{ height: '420px', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                            <div style={{ textAlign: 'center' }}>
                                <Camera size={48} style={{ marginBottom: '12px' }} />
                                <div>Stream connected in demo mode</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Status: {selectedCamera.status}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VisionManager;
