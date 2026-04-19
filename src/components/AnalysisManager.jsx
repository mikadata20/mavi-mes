import React, { useState, useEffect } from 'react';
import { 
    BarChart3, 
    Plus, 
    Search, 
    Trash2, 
    Edit3, 
    ExternalLink,
    Filter,
    LayoutGrid,
    MoreVertical,
    Activity,
    TrendingUp,
    PieChart
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getAllSavedAnalyses, deleteAnalysis } from '../utils/supabaseFrontlineDB';

const AnalysisManager = () => {
    const navigate = useNavigate();
    const [analyses, setAnalyses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getAllSavedAnalyses();
            setAnalyses(data);
        } catch (err) {
            console.error('Failed to load analyses:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this analysis?')) return;
        try {
            await deleteAnalysis(id);
            loadData();
        } catch (err) {
            alert('Error deleting analysis: ' + err.message);
        }
    };

    const filteredAnalyses = analyses.filter(a => 
        a.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ height: '100%', backgroundColor: '#f8fafc', padding: '40px', overflowY: 'auto' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <div>
                        <h1 style={{ color: '#0f172a', fontSize: '2.2rem', fontWeight: 900, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ backgroundColor: '#4f46e5', padding: '10px', borderRadius: '12px' }}>
                                <BarChart3 size={32} color="white" />
                            </div>
                            Analytics Manager
                        </h1>
                        <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Create and manage standalone charts for your shop floor operations.</p>
                    </div>
                    <Link 
                        to="/analytics/new"
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 28px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', textDecoration: 'none', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)', transition: 'transform 0.2s' }}
                    >
                        <Plus size={20} /> Create New Analysis
                    </Link>
                </div>

                {/* Search Bar */}
                <div style={{ marginBottom: '30px', position: 'relative' }}>
                    <Search size={20} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                        type="text"
                        placeholder="Search analyses..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '16px 16px 16px 50px', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                    />
                </div>

                {/* Content */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '100px', color: '#64748b' }}>Loading analyses...</div>
                ) : filteredAnalyses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '100px', backgroundColor: 'white', borderRadius: '24px', border: '2px dashed #e2e8f0' }}>
                        <BarChart3 size={64} color="#e2e8f0" style={{ marginBottom: '20px' }} />
                        <h2 style={{ color: '#1e293b', marginBottom: '10px' }}>No analyses found</h2>
                        <p style={{ color: '#64748b' }}>Start by creating your first standalone chart.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
                        {filteredAnalyses.map(analysis => (
                            <div key={analysis.id} style={{ backgroundColor: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                <div style={{ padding: '24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                        <div style={{ backgroundColor: '#f5f3ff', padding: '10px', borderRadius: '10px' }}>
                                            {analysis.config?.type === 'BAR' ? <BarChart3 size={20} color="#8b5cf6" /> : analysis.config?.type === 'LINE' ? <TrendingUp size={20} color="#8b5cf6" /> : <PieChart size={20} color="#8b5cf6" />}
                                        </div>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <button onClick={() => navigate(`/analytics/edit/${analysis.id}`)} style={{ padding: '8px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}><Edit3 size={18} /></button>
                                            <button onClick={() => handleDelete(analysis.id)} style={{ padding: '8px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                    <h3 style={{ margin: '0 0 10px 0', fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>{analysis.name}</h3>
                                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>{analysis.description || 'No description provided.'}</p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Updated {new Date(analysis.updated_at).toLocaleDateString()}</div>
                                        <Link to={`/analytics/edit/${analysis.id}`} style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4f46e5', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>View Details <ExternalLink size={14} /></Link>
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

export default AnalysisManager;
