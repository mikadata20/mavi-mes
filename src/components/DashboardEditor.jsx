import React, { useState, useEffect } from 'react';
import { 
    Save, 
    ArrowLeft, 
    Layout, 
    Plus, 
    Trash2, 
    Settings,
    BarChart3,
    TrendingUp,
    PieChart,
    ChevronRight,
    Search,
    Grid3X3
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { saveDashboard, getAllDashboards, getAllSavedAnalyses } from '../utils/supabaseFrontlineDB';

const DashboardEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [savedAnalyses, setSavedAnalyses] = useState([]);
    
    const [dashboard, setDashboard] = useState({
        name: 'New Dashboard',
        description: '',
        layout: [] // Array of { analysisId, x, y, w, h }
    });

    useEffect(() => {
        loadInitialData();
    }, [id]);

    const loadInitialData = async () => {
        try {
            const analyses = await getAllSavedAnalyses();
            setSavedAnalyses(analyses || []);

            if (id) {
                const results = await getAllDashboards();
                const existing = results.find(d => d.id === id);
                if (existing) setDashboard(existing);
            }
        } catch (err) {
            console.error('Error loading dashboard data:', err);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await saveDashboard(dashboard);
            navigate('/dashboards');
        } catch (err) {
            alert('Error saving dashboard: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const addWidget = (analysis) => {
        const newWidget = {
            id: `w_${Date.now()}`,
            analysisId: analysis.id,
            name: analysis.name,
            type: analysis.config?.type || 'BAR'
        };
        setDashboard(prev => ({
            ...prev,
            layout: [...prev.layout, newWidget]
        }));
    };

    const removeWidget = (widgetId) => {
        setDashboard(prev => ({
            ...prev,
            layout: prev.layout.filter(w => w.id !== widgetId)
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
                    <button onClick={() => navigate('/dashboards')} style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0' }}></div>
                    <div>
                        <input 
                            value={dashboard.name}
                            onChange={(e) => setDashboard({ ...dashboard, name: e.target.value })}
                            style={{ border: 'none', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', outline: 'none', background: 'transparent' }}
                        />
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Standalone Dashboard Editor</div>
                    </div>
                </div>
                <button 
                    onClick={handleSave}
                    disabled={loading}
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', 
                        backgroundColor: '#0ea5e9', color: 'white', border: 'none', borderRadius: '8px', 
                        fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.2s' 
                    }}
                >
                    <Save size={18} /> {loading ? 'Saving...' : 'Save Dashboard'}
                </button>
            </div>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Sidebar - Widget Selection */}
                <div style={{ width: '320px', backgroundColor: 'white', borderRight: '1px solid #e2e8f0', overflowY: 'auto', padding: '24px' }}>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={14} /> Add Analysis
                    </h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {savedAnalyses.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', border: '1px dashed #e2e8f0', borderRadius: '12px' }}>
                                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No saved analyses found. Create one first!</p>
                            </div>
                        ) : (
                            savedAnalyses.map(analysis => (
                                <button 
                                    key={analysis.id}
                                    onClick={() => addWidget(analysis)}
                                    style={{ 
                                        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', 
                                        backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px',
                                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = '#0ea5e9'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                                >
                                    <div style={{ backgroundColor: 'white', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                        {analysis.config?.type === 'BAR' ? <BarChart3 size={16} color="#0ea5e9" /> : analysis.config?.type === 'LINE' ? <TrendingUp size={16} color="#0ea5e9" /> : <PieChart size={16} color="#0ea5e9" />}
                                    </div>
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{analysis.name}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{analysis.config?.type} Chart</div>
                                    </div>
                                    <Plus size={14} color="#94a3b8" />
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Dashboard Canvas */}
                <div style={{ flex: 1, padding: '40px', overflowY: 'auto', backgroundColor: '#f1f5f9' }}>
                    <div style={{ 
                        minHeight: '100%', border: '2px dashed #cbd5e1', borderRadius: '24px', padding: '30px',
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px',
                        alignContent: 'start'
                    }}>
                        {dashboard.layout.length === 0 ? (
                            <div style={{ gridColumn: '1 / -1', height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                <Grid3X3 size={48} style={{ marginBottom: '16px' }} />
                                <p>Your dashboard is empty. Add analyses from the sidebar.</p>
                            </div>
                        ) : (
                            dashboard.layout.map(widget => (
                                <div key={widget.id} style={{ backgroundColor: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', position: 'relative', minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>{widget.name}</h3>
                                        <button 
                                            onClick={() => removeWidget(widget.id)}
                                            style={{ padding: '6px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', borderRadius: '6px' }}
                                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                            onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <div style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid #f1f5f9' }}>
                                        {widget.type === 'BAR' ? <BarChart3 size={32} color="#cbd5e1" /> : widget.type === 'LINE' ? <TrendingUp size={32} color="#cbd5e1" /> : <PieChart size={32} color="#cbd5e1" />}
                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '10px' }}>Widget Preview</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardEditor;
