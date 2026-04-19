import React, { useState, useEffect } from 'react';
import { 
    Save, 
    ArrowLeft, 
    BarChart3, 
    TrendingUp, 
    PieChart, 
    Settings, 
    Database, 
    Layout,
    ChevronRight,
    Play,
    Info,
    LineChart,
    Activity
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { saveAnalysis, getAllSavedAnalyses, getTables } from '../utils/supabaseFrontlineDB';
// Note: We would ideally use the same chart component as AppBuilder, 
// for now let's build the editor UI structure.

const AnalysisEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [tables, setTables] = useState([]);
    
    const [analysis, setAnalysis] = useState({
        name: 'New Analysis',
        description: '',
        config: {
            type: 'BAR',
            tableId: '',
            xAxisColumn: '',
            yAxisColumn: '',
            aggregation: 'COUNT',
            color: '#4f46e5',
            showArea: false,
            stacked: false
        }
    });

    useEffect(() => {
        loadInitialData();
    }, [id]);

    const loadInitialData = async () => {
        try {
            const tableData = await getTables();
            setTables(tableData);

            if (id) {
                const results = await getAllSavedAnalyses();
                const existing = results.find(a => a.id === id);
                if (existing) setAnalysis(existing);
            }
        } catch (err) {
            console.error('Error loading editor data:', err);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await saveAnalysis(analysis);
            navigate('/analytics');
        } catch (err) {
            alert('Error saving analysis: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateConfig = (updates) => {
        setAnalysis(prev => ({
            ...prev,
            config: { ...prev.config, ...updates }
        }));
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
            {/* Top Bar */}
            <div style={{ 
                height: '64px', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' 
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={() => navigate('/analytics')} style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0' }}></div>
                    <div>
                        <input 
                            value={analysis.name}
                            onChange={(e) => setAnalysis({ ...analysis, name: e.target.value })}
                            style={{ border: 'none', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', outline: 'none', background: 'transparent' }}
                        />
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Standalone Analysis Editor</div>
                    </div>
                </div>
                <button 
                    onClick={handleSave}
                    disabled={loading}
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', 
                        backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', 
                        fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.2s' 
                    }}
                >
                    <Save size={18} /> {loading ? 'Saving...' : 'Save Analysis'}
                </button>
            </div>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Sidebar Configuration */}
                <div style={{ width: '380px', backgroundColor: 'white', borderRight: '1px solid #e2e8f0', overflowY: 'auto', padding: '24px' }}>
                    <div style={{ marginBottom: '30px' }}>
                        <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Play size={14} /> System Shortcuts
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {[
                                { id: 'throughput', label: 'Total Throughput', desc: 'Count of all completions over time', config: { tableId: 'SYSTEM:COMPLETIONS', xAxisColumn: 'timestamp', yAxisColumn: 'id', aggregation: 'COUNT', type: 'BAR' } },
                                { id: 'cycletime', label: 'Avg Cycle Time', desc: 'Average duration per completion', config: { tableId: 'SYSTEM:COMPLETIONS', xAxisColumn: 'timestamp', yAxisColumn: 'duration', aggregation: 'AVERAGE', type: 'LINE' } },
                                { id: 'yield', label: 'Operator Yield', desc: 'Percentage of successful completions', config: { tableId: 'SYSTEM:COMPLETIONS', xAxisColumn: 'timestamp', yAxisColumn: 'status', aggregation: 'PERCENT_SUCCESS', type: 'PIE' } }
                            ].map(s => (
                                <button 
                                    key={s.id}
                                    onClick={() => {
                                        setAnalysis(prev => ({
                                            ...prev,
                                            name: s.label,
                                            config: { ...prev.config, ...s.config }
                                        }));
                                    }}
                                    style={{ 
                                        textAlign: 'left', padding: '12px', border: '1px solid #e2e8f0', 
                                        borderRadius: '12px', backgroundColor: 'white', cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = '#4f46e5'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                                >
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>{s.label}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{s.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: '30px' }}>
                        <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Layout size={14} /> Analysis Type
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                            {[
                                { id: 'BAR', icon: BarChart3, label: 'Bar' },
                                { id: 'LINE', icon: TrendingUp, label: 'Line' },
                                { id: 'PIE', icon: PieChart, label: 'Pie' }
                            ].map(t => (
                                <button 
                                    key={t.id}
                                    onClick={() => updateConfig({ type: t.id })}
                                    style={{ 
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', 
                                        padding: '12px', border: analysis.config.type === t.id ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                                        borderRadius: '12px', backgroundColor: analysis.config.type === t.id ? '#f5f3ff' : 'white',
                                        cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                >
                                    <t.icon size={20} color={analysis.config.type === t.id ? '#4f46e5' : '#64748b'} />
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: analysis.config.type === t.id ? '#4f46e5' : '#64748b' }}>{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: '30px' }}>
                        <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Database size={14} /> Data Source
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Assign Table</label>
                            <select 
                                value={analysis.config.tableId}
                                onChange={(e) => updateConfig({ tableId: e.target.value })}
                                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem', outline: 'none' }}
                            >
                                <option value="">Select a source table...</option>
                                <optgroup label="System Sources">
                                    <option value="SYSTEM:COMPLETIONS">App Completions (History)</option>
                                </optgroup>
                                <optgroup label="Custom Tables">
                                    {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </optgroup>
                            </select>
                        </div>
                    </div>

                    <div style={{ marginBottom: '30px' }}>
                        <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Settings size={14} /> Metrics & Axes
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>X-Axis (Category)</label>
                                <input placeholder="e.g. status" value={analysis.config.xAxisColumn} onChange={e => updateConfig({ xAxisColumn: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Y-Axis (Value)</label>
                                <input placeholder="e.g. quantity" value={analysis.config.yAxisColumn} onChange={e => updateConfig({ yAxisColumn: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem' }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview Area */}
                <div style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '40px', flex: 1, display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Analysis Preview</h2>
                                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Real-time visualization of your configuration.</p>
                            </div>
                            <div style={{ backgroundColor: '#f1f5f9', padding: '8px 16px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Activity size={14} /> LIVE PREVIEW
                            </div>
                        </div>

                        {/* Chart Placeholder */}
                        <div style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: '16px', border: '2px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ textAlign: 'center' }}>
                                <BarChart3 size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                                <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                                    Select a data source to generate the preview.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Metadata Panel */}
                    <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '12px' }}>Description</label>
                        <textarea 
                            value={analysis.description}
                            onChange={(e) => setAnalysis({ ...analysis, description: e.target.value })}
                            placeholder="Add a description for this analysis..."
                            style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.9rem', outline: 'none', minHeight: '80px', resize: 'vertical' }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalysisEditor;
