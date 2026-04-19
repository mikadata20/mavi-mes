import React, { useState, useEffect } from 'react';
import { Activity, AlertCircle, CheckCircle2, Clock, Map, TrendingUp, Users, Zap } from 'lucide-react';

const Home = () => {
  const [activeAndons, setActiveAndons] = useState([]);
  const [workstations, setWorkstations] = useState([
    { id: 'WS-01', name: 'Assembly Station A', status: 'RUNNING', currentJob: 'WO-2026-001', expectedOutput: 150, actualOutput: 45 },
    { id: 'WS-02', name: 'Testing Station B', status: 'READY', currentJob: null, expectedOutput: 0, actualOutput: 0 },
    { id: 'WS-03', name: 'Packaging Station C', status: 'RUNNING', currentJob: 'WO-2026-002', expectedOutput: 300, actualOutput: 120 },
    { id: 'WS-04', name: 'Inspection Station D', status: 'RUNNING', currentJob: 'WO-2026-003', expectedOutput: 50, actualOutput: 48 },
  ]);

  useEffect(() => {
    // Listen for mock real-time events from our auditLog system
    const handleAndonEvent = (e) => {
      const { type, payload } = e.detail;
      
      if (type === 'ANDON_TRIGGERED') {
        const newAndon = {
          id: `andon_${Date.now()}`,
          workstation: payload.workstation,
          category: payload.category,
          detail: payload.detail,
          startTime: payload.startTime,
        };
        
        setActiveAndons(prev => [newAndon, ...prev]);
        
        // Update workstation status
        setWorkstations(prev => prev.map(ws => 
          ws.id === payload.workstation ? { ...ws, status: 'DOWN' } : ws
        ));
      } else if (type === 'ANDON_RESOLVED') {
        // Remove from active list
        setActiveAndons(prev => prev.filter(a => a.workstation !== payload.workstation));
        
        // Update workstation status back to READY/RUNNING (simplification: assume READY)
        setWorkstations(prev => prev.map(ws => 
          ws.id === payload.workstation ? { ...ws, status: 'READY' } : ws
        ));
      }
    };

    // Listen for current window events
    window.addEventListener('MAVI_ANDON_EVENT', handleAndonEvent);
    
    // Listen for other tabs via BroadcastChannel
    let channel;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel('mavi_andon_channel');
        channel.onmessage = (msgEvent) => {
          if (msgEvent.data && msgEvent.data.type === 'MAVI_ANDON_EVENT') {
            handleAndonEvent({ detail: msgEvent.data.detail });
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported');
    }

    return () => {
      window.removeEventListener('MAVI_ANDON_EVENT', handleAndonEvent);
      if (channel) channel.close();
    };
  }, []);

  // Timer to update "Elapsed Time" for active Andons
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    if (activeAndons.length === 0) return;
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [activeAndons.length]);

  const formatElapsed = (startTime) => {
    const seconds = Math.floor((currentTime - startTime) / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'RUNNING': return { bg: '#dcfce7', text: '#166534', border: '#bbf7d0', icon: <Activity size={16} /> };
      case 'READY': return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0', icon: <CheckCircle2 size={16} /> };
      case 'DOWN': return { bg: '#fee2e2', text: '#991b1b', border: '#fecaca', icon: <AlertCircle size={16} /> };
      default: return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0', icon: <Clock size={16} /> };
    }
  };

  return (
    <div style={{ padding: '30px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Map size={28} color="#3b82f6" /> Shop Floor Overview
          </h1>
          <p style={{ margin: '5px 0 0 0', color: '#64748b' }}>Real-time monitoring and Andon response dashboard</p>
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <div style={{ backgroundColor: 'white', padding: '12px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>OEE Today</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>78.4%</span>
          </div>
          <div style={{ backgroundColor: 'white', padding: '12px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Active Andons</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 900, color: activeAndons.length > 0 ? '#ef4444' : '#22c55e' }}>{activeAndons.length}</span>
          </div>
        </div>
      </div>

      {/* ACTIVE ALERTS SECTION */}
      {activeAndons.length > 0 && (
        <div style={{ marginBottom: '35px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444', animation: 'pulse 2s infinite' }} />
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '1px' }}>Action Required: Active Andon Alerts</h2>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {activeAndons.map(andon => (
              <div key={andon.id} style={{ backgroundColor: '#fee2e2', border: '2px solid #ef4444', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.2)' }}>
                <div style={{ backgroundColor: '#ef4444', padding: '12px 20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{andon.workstation}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: 'monospace' }}>{formatElapsed(andon.startTime)}</div>
                </div>
                <div style={{ padding: '20px' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#991b1b', marginBottom: '8px' }}>{andon.category}</div>
                  {andon.detail && <p style={{ fontSize: '0.9rem', color: '#7f1d1d', margin: 0 }}>"{andon.detail}"</p>}
                  
                  <button 
                    style={{ marginTop: '20px', width: '100%', padding: '12px', backgroundColor: 'white', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '6px', fontWeight: 800, cursor: 'pointer', transition: 'background-color 0.2s' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#fef2f2'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                    onClick={() => alert(`In a full implementation, you'd navigate to ${andon.workstation} or acknowledge it here.`)}
                  >
                    ACKNOWLEDGE
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WORKSTATION GRID */}
      <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '20px' }}>Live Workstations</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
        {workstations.map(ws => {
          const conf = getStatusColor(ws.status);
          const progress = ws.expectedOutput > 0 ? Math.round((ws.actualOutput / ws.expectedOutput) * 100) : 0;
          const isDown = ws.status === 'DOWN';
          
          return (
            <div 
              key={ws.id} 
              style={{ 
                backgroundColor: isDown ? '#fef2f2' : 'white', 
                borderRadius: '12px', 
                border: isDown ? '2px solid transparent' : `1px solid ${conf.border}`, 
                boxShadow: isDown ? '0 4px 15px rgba(239, 68, 68, 0.4)' : '0 4px 6px -1px rgba(0,0,0,0.05)', 
                overflow: 'hidden', 
                transition: 'transform 0.2s', 
                cursor: 'pointer',
                animation: isDown ? 'pulse-border 2s infinite' : 'none'
              }} 
              onMouseEnter={(e) => !isDown && (e.currentTarget.style.transform = 'translateY(-2px)')} 
              onMouseLeave={(e) => !isDown && (e.currentTarget.style.transform = 'none')}
            >
              <div style={{ padding: '15px 20px', borderBottom: `1px solid ${isDown ? '#fecaca' : '#f1f5f9'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isDown ? '#fef2f2' : 'transparent' }}>
                <span style={{ fontWeight: 800, color: isDown ? '#991b1b' : '#0f172a' }}>{ws.id}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', backgroundColor: conf.bg, color: conf.text, fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.5px' }}>
                  {conf.icon} {ws.status}
                </span>
              </div>
              
              <div style={{ padding: '20px' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155', marginBottom: '15px' }}>{ws.name}</div>
                
                {ws.currentJob ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', marginBottom: '5px' }}>
                      <span>Job: {ws.currentJob}</span>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{ws.actualOutput} / {ws.expectedOutput}</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progress}%`, backgroundColor: conf.text, transition: 'width 0.5s' }} />
                    </div>
                  </>
                ) : (
                  <div style={{ height: '28px', display: 'flex', alignItems: 'center', color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>
                    No active job
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

// Global style for the pulse animation if it doesn't exist
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }
    @keyframes pulse-border {
      0% { border-color: rgba(239, 68, 68, 0.2); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
      50% { border-color: rgba(239, 68, 68, 1); box-shadow: 0 0 20px 2px rgba(239, 68, 68, 0.6); }
      100% { border-color: rgba(239, 68, 68, 0.2); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
    }
  `;
  document.head.appendChild(style);
}

export default Home;
