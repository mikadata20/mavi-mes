import React, { useState, useEffect } from 'react';
import { 
    ClipboardList, 
    Plus, 
    Search, 
    AlertCircle, 
    CheckCircle2, 
    Clock, 
    Trash2, 
    ArrowRight,
    Package,
    Calendar,
    Tag,
    X
} from 'lucide-react';
import { getAllFrontlineApps, getProductionQueue, createProductionJob, updateJobStatus } from '../utils/supabaseFrontlineDB';

const WorkOrderDashboard = () => {
    const [jobs, setJobs] = useState([]);
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNewModal, setShowNewModal] = useState(false);
    
    // Form State
    const [form, setForm] = useState({
        work_order: '',
        app_id: '',
        target_qty: 100,
        priority: 'P2'
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [jobData, appData] = await Promise.all([
                getProductionQueue(),
                getAllFrontlineApps()
            ]);
            setJobs(jobData);
            setApps(appData);
        } catch (err) {
            console.error('Failed to load dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateJob = async (e) => {
        e.preventDefault();
        try {
            await createProductionJob(form);
            setShowNewModal(false);
            setForm({ work_order: '', app_id: '', target_qty: 100, priority: 'P2' });
            loadData();
        } catch (err) {
            alert('Error creating job: ' + err.message);
        }
    };

    const handleUpdateStatus = async (id, status) => {
        if (!confirm(`Mark job as ${status}?`)) return;
        try {
            await updateJobStatus(id, status);
            loadData();
        } catch (err) {
            alert('Error updating status: ' + err.message);
        }
    };

    return (
        <div style={{ height: '100%', backgroundColor: '#f8fafc', padding: '40px', overflowY: 'auto' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <div>
                        <h1 style={{ color: '#0f172a', fontSize: '2.2rem', fontWeight: 900, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ backgroundColor: '#001e3c', padding: '10px', borderRadius: '12px' }}>
                                <ClipboardList size={32} color="white" />
                            </div>
                            Production Orders
                        </h1>
                        <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Manage and assign work orders to frontline stations.</p>
                    </div>
                    <button 
                        onClick={() => setShowNewModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 28px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,123,255,0.2)', transition: 'transform 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <Plus size={20} /> Create New Order
                    </button>
                </div>

                {/* Dashboard Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '10px' }}>Active Orders</div>
                        <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a' }}>{jobs.length}</div>
                    </div>
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '10px' }}>High Priority</div>
                        <div style={{ fontSize: '2rem', fontWeight: 900, color: '#dc2626' }}>{jobs.filter(j => j.priority === 'P1').length}</div>
                    </div>
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '10px' }}>Available Apps</div>
                        <div style={{ fontSize: '2rem', fontWeight: 900, color: '#007bff' }}>{apps.length}</div>
                    </div>
                </div>

                {/* Job List */}
                <div style={{ backgroundColor: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '20px 30px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fcfcfd' }}>
                        <h3 style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>Order Queue</h3>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                <input placeholder="Search orders..." style={{ padding: '8px 12px 8px 35px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }} />
                            </div>
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <th style={{ padding: '15px 30px', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Work Order</th>
                                    <th style={{ padding: '15px 30px', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Target App</th>
                                    <th style={{ padding: '15px 30px', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Quantity</th>
                                    <th style={{ padding: '15px 30px', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Priority</th>
                                    <th style={{ padding: '15px 30px', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Status</th>
                                    <th style={{ padding: '15px 30px', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {jobs.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                                <Package size={48} color="#e2e8f0" />
                                                <div style={{ fontSize: '1rem', fontWeight: 600 }}>No pending orders</div>
                                                <div style={{ fontSize: '0.8rem' }}>Click "Create New Order" to assign production jobs.</div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    jobs.map(job => {
                                        const app = apps.find(a => a.id === job.app_id);
                                        return (
                                            <tr key={job.id} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fcfdff'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                                <td style={{ padding: '20px 30px' }}>
                                                    <div style={{ fontWeight: 800, color: '#0f172a' }}>{job.work_order}</div>
                                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '4px' }}>Created {new Date(job.created_at).toLocaleDateString()}</div>
                                                </td>
                                                <td style={{ padding: '20px 30px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ padding: '6px', backgroundColor: '#f1f5f9', borderRadius: '4px' }}>
                                                            <Tag size={14} color="#64748b" />
                                                        </div>
                                                        <span style={{ fontWeight: 600, color: '#475569' }}>{app ? app.name : 'Unknown Application'}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '20px 30px' }}>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{job.target_qty}</div>
                                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Units Planned</div>
                                                </td>
                                                <td style={{ padding: '20px 30px' }}>
                                                    <span style={{ 
                                                        padding: '4px 10px', 
                                                        borderRadius: '6px', 
                                                        fontSize: '0.65rem', 
                                                        fontWeight: 800,
                                                        backgroundColor: job.priority === 'P1' ? '#fef2f2' : '#f0fdf4',
                                                        color: job.priority === 'P1' ? '#dc2626' : '#16a34a',
                                                        border: `1px solid ${job.priority === 'P1' ? '#fecaca' : '#bbf7d0'}`
                                                    }}>
                                                        {job.priority === 'P1' ? 'HIGH PRIORITY' : 'NORMAL'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '20px 30px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563eb', fontWeight: 700, fontSize: '0.85rem' }}>
                                                        <div style={{ width: '8px', height: '8px', backgroundColor: '#2563eb', borderRadius: '50%' }} />
                                                        {job.status}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '20px 30px', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                        <button 
                                                            onClick={() => handleUpdateStatus(job.id, 'COMPLETED')}
                                                            style={{ border: 'none', backgroundColor: '#f0fdf4', color: '#16a34a', padding: '8px 12px', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                                                        >
                                                            <CheckCircle2 size={14} /> Done
                                                        </button>
                                                        <button 
                                                            onClick={() => handleUpdateStatus(job.id, 'CANCELLED')}
                                                            style={{ border: 'none', backgroundColor: '#fef2f2', color: '#dc2626', padding: '8px 12px', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Create Job Modal */}
            {showNewModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                    <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '24px', width: '500px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                            <h2 style={{ margin: 0, fontWeight: 900, fontSize: '1.5rem', color: '#0f172a' }}>New Production Order</h2>
                            <button onClick={() => setShowNewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
                        </div>

                        <form onSubmit={handleCreateJob} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Work Order ID (Lot Number)</label>
                                <input 
                                    required
                                    value={form.work_order}
                                    onChange={e => setForm({ ...form, work_order: e.target.value.toUpperCase() })}
                                    placeholder="e.g. LOT-20231012-001"
                                    style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Assign Application</label>
                                <select 
                                    required
                                    value={form.app_id}
                                    onChange={e => setForm({ ...form, app_id: e.target.value })}
                                    style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', backgroundColor: 'white' }}
                                >
                                    <option value="">Select an application...</option>
                                    {apps.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Target Quantity</label>
                                    <input 
                                        type="number"
                                        required
                                        value={form.target_qty}
                                        onChange={e => setForm({ ...form, target_qty: parseInt(e.target.value) })}
                                        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Priority</label>
                                    <select 
                                        value={form.priority}
                                        onChange={e => setForm({ ...form, priority: e.target.value })}
                                        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', backgroundColor: 'white' }}
                                    >
                                        <option value="P1">High (P1)</option>
                                        <option value="P2">Normal (P2)</option>
                                    </select>
                                </div>
                            </div>

                            <button 
                                type="submit"
                                style={{ marginTop: '20px', padding: '16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                            >
                                Dispatch Order <ArrowRight size={20} />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkOrderDashboard;
