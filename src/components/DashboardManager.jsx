import React, { useState, useEffect } from 'react';
import { 
    Layout, 
    Plus, 
    Search, 
    Trash2, 
    Edit3, 
    ExternalLink,
    Clock,
    LayoutGrid,
    MoreVertical
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getAllDashboards, deleteDashboard, saveDashboard, saveAnalysis } from '../utils/supabaseFrontlineDB';
import { Activity, LayoutDashboard } from 'lucide-react';

const DashboardManager = () => {
    const navigate = useNavigate();
    const [dashboards, setDashboards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getAllDashboards();
            setDashboards(data || []);
        } catch (err) {
            console.error('Failed to load dashboards:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this dashboard?')) return;
        try {
            await deleteDashboard(id);
            loadData();
        } catch (err) {
            alert('Error deleting dashboard: ' + err.message);
        }
    };

    const generateDefaultPerformanceDashboard = async () => {
        setLoading(true);
        try {
            // 1. Create Throughput Analysis
            const throughputAnalysis = {
                id: `analysis_throughput_${Date.now()}`,
                name: 'Total Throughput (By App)',
                description: 'Historical completion counts aggregated by Application',
                tableId: 'SYSTEM:COMPLETIONS',
                xAxis: 'appId',
                yAxis: 'count', // count is a virtual field for SYSTEM:COMPLETIONS
                chartType: 'DASHBOARD_CHART_BAR'
            };

            // 2. Create Cycle Time Analysis
            const cycleTimeAnalysis = {
                id: `analysis_cycletime_${Date.now()}`,
                name: 'Avg Cycle Time (By Operator)',
                description: 'Average duration of completed cycles per Operator',
                tableId: 'SYSTEM:COMPLETIONS',
                xAxis: 'operator',
                yAxis: 'duration',
                aggregation: 'avg',
                chartType: 'DASHBOARD_CHART_LINE'
            };

            await saveAnalysis(throughputAnalysis);
            await saveAnalysis(cycleTimeAnalysis);

            // 3. Create Dashboard
            const newDashboard = {
                id: `dashboard_perf_${Date.now()}`,
                name: 'App Performance Dashboard',
                description: 'Automatically generated overview of production throughput and cycle efficiency.',
                layout: [
                    { i: throughputAnalysis.id, x: 0, y: 0, w: 6, h: 4, type: 'ANALYSIS', analysisId: throughputAnalysis.id },
                    { i: cycleTimeAnalysis.id, x: 6, y: 0, w: 6, h: 4, type: 'ANALYSIS', analysisId: cycleTimeAnalysis.id }
                ]
            };

            await saveDashboard(newDashboard);
            alert('App Performance Dashboard generated successfully!');
            loadData();
        } catch (err) {
            console.error('Failed to generate dashboard:', err);
            alert('Error generating dashboard: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredDashboards = dashboards.filter(d => 
        d.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ height: '100%', backgroundColor: '#f8fafc', padding: '40px', overflowY: 'auto' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <div>
                        <h1 style={{ color: '#0f172a', fontSize: '2.2rem', fontWeight: 900, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ backgroundColor: '#0ea5e9', padding: '10px', borderRadius: '12px' }}>
                                <Layout size={32} color="white" />
                            </div>
                            Dashboards
                        </h1>
                        <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Combine multiple analyses into a single real-time operational overview.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button 
                            onClick={generateDefaultPerformanceDashboard}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 28px', backgroundColor: 'white', color: '#0ea5e9', border: '2px solid #0ea5e9', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.1)' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f9ff'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                        >
                            <Activity size={20} /> Auto-Generate Performance Dashboard
                        </button>
                        <button 
                            onClick={() => navigate('/dashboards/new')}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 28px', backgroundColor: '#0ea5e9', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', textDecoration: 'none', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.2)', transition: 'transform 0.2s' }}
                        >
                            <Plus size={20} /> Create New Dashboard
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div style={{ marginBottom: '30px', position: 'relative' }}>
                    <Search size={20} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                        type="text"
                        placeholder="Search dashboards..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '16px 16px 16px 50px', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                    />
                </div>

                {/* Content */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '100px', color: '#64748b' }}>Loading dashboards...</div>
                ) : filteredDashboards.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '100px', backgroundColor: 'white', borderRadius: '24px', border: '2px dashed #e2e8f0' }}>
                        <LayoutGrid size={64} color="#e2e8f0" style={{ marginBottom: '20px' }} />
                        <h2 style={{ color: '#1e293b', marginBottom: '10px' }}>No dashboards found</h2>
                        <p style={{ color: '#64748b' }}>Design your first operational dashboard to visualize your data efficiently.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
                        {filteredDashboards.map(dashboard => (
                            <div key={dashboard.id} style={{ backgroundColor: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                <div style={{ padding: '24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                        <div style={{ backgroundColor: '#f0f9ff', padding: '10px', borderRadius: '10px' }}>
                                            <LayoutGrid size={20} color="#0ea5e9" />
                                        </div>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <button onClick={() => navigate(`/dashboards/edit/${dashboard.id}`)} style={{ padding: '8px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}><Edit3 size={18} /></button>
                                            <button onClick={() => handleDelete(dashboard.id)} style={{ padding: '8px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                    <h3 style={{ margin: '0 0 10px 0', fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>{dashboard.name}</h3>
                                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>{dashboard.description || 'No description provided.'}</p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Updated {new Date(dashboard.updated_at).toLocaleDateString()}</div>
                                        <Link to={`/dashboards/edit/${dashboard.id}`} style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0ea5e9', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>View Dashboard <ExternalLink size={14} /></Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardManager;
