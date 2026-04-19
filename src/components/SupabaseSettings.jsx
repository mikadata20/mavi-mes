import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  Save, 
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SupabaseSettings = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState('DISCONNECTED');
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('supabase_storage_settings');
      if (raw) {
        const parsed = JSON.parse(raw);
        setUrl(parsed.url || '');
        setAnonKey(parsed.anonKey || parsed.anon_key || parsed.apiKey || '');
        // Simple check for now
        if (parsed.url && (parsed.anonKey || parsed.anon_key || parsed.apiKey)) {
           setStatus('CONNECTED');
        }
      }
    } catch (e) {
      console.error('Failed to load supabase settings:', e);
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      let cleanUrl = url.trim();

      // Detection for Dashboard URL instead of API URL
      if (cleanUrl.includes('supabase.com/dashboard')) {
        // Try to extract project ref
        const match = cleanUrl.match(/\/project\/([a-z0-9]+)/);
        const projectRef = match ? match[1] : null;
        
        let suggestMsg = 'You are using a Dashboard URL. Please use the "Project URL" found in Project Settings > API.';
        if (projectRef) {
          suggestMsg += ` It should look like: https://${projectRef}.supabase.co`;
        }
        throw new Error(suggestMsg);
      }

      if (!cleanUrl.startsWith('http')) {
         throw new Error('Please enter a valid URL starting with https://');
      }
      if (!anonKey) {
         throw new Error('Anon Key is required.');
      }

      const settings = { url: cleanUrl, anonKey: anonKey.trim() };
      localStorage.setItem('supabase_storage_settings', JSON.stringify(settings));
      
      setStatus('CONNECTED');
      setFeedback({ success: true, message: 'Settings saved successfully! Reloading application...' });
      
      // Mandatory reload to re-init all clients
      setTimeout(() => {
         window.location.reload();
      }, 1500);
    } catch (err) {
      setFeedback({ success: false, message: err.message });
      setIsSaving(false);
    }
  };

  return (
    <div style={{ 
      height: '100vh', width: '100%', backgroundColor: '#f8f9fa', color: '#495057', 
      display: 'flex', flexDirection: 'column', fontFamily: "'Inter', system-ui, sans-serif" 
    }}>
      {/* Top Navbar */}
      <div style={{ 
        padding: '16px 24px', borderBottom: '1px solid #dee2e6', display: 'flex', 
        justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            style={{ 
              padding: '8px 20px', borderRadius: '4px', backgroundColor: '#017E84', color: '#fff', 
              border: 'none', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.1s',
              opacity: isSaving ? 0.7 : 1, boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            {isSaving ? 'SAVING...' : 'SAVE & CONNECT'}
          </button>
          <button 
            onClick={() => navigate(-1)}
            style={{ 
              padding: '8px 20px', borderRadius: '4px', backgroundColor: '#fff', color: '#495057', 
              border: '1px solid #dee2e6', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer' 
            }}
          >
            DISCARD
          </button>
          <div style={{ width: '1px', height: '24px', backgroundColor: '#dee2e6', margin: '0 8px' }}></div>
          <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#495057' }}>Database Settings</h1>
        </div>
        <button 
          onClick={() => navigate(-1)}
          style={{ 
            padding: '8px', borderRadius: '4px', border: 'none', backgroundColor: 'transparent', 
            color: '#adb5bd', cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ 
          width: '280px', backgroundColor: '#f0f2f5', borderRight: '1px solid #dee2e6', 
          display: 'flex', flexDirection: 'column', padding: '16px 0' 
        }}>
          <div style={{ padding: '0 24px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #dee2e6', marginBottom: '16px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '4px', backgroundColor: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Database size={18} />
            </div>
            <span style={{ fontSize: '0.950rem', fontWeight: 600, color: '#495057' }}>Supabase Configuration</span>
          </div>
          <div style={{ padding: '0 24px', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
            Manage your backend cloud infrastructure and database connectivity.
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, backgroundColor: '#fff', overflowY: 'auto' }}>
          <div style={{ padding: '32px 48px', maxWidth: '800px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#212529', margin: 0 }}>Project Connectivity</h2>
                <p style={{ fontSize: '0.85rem', color: '#6c757d', margin: 0 }}>Set your Project URL and API Key to synchronize your MES applications.</p>
              </div>

              {/* Status Banner */}
              <div style={{ 
                padding: '12px 16px', borderRadius: '4px', border: '1px solid #cce5ff', 
                backgroundColor: '#f8f9fa', borderLeftWidth: '4px', 
                borderLeftColor: status === 'CONNECTED' ? '#10b981' : '#ef4444',
                display: 'flex', alignItems: 'center', gap: '12px' 
              }}>
                <div style={{ color: status === 'CONNECTED' ? '#10b981' : '#ef4444' }}>
                   {status === 'CONNECTED' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#495057' }}>
                   Platform Status: <strong style={{ color: status === 'CONNECTED' ? '#10b981' : '#ef4444' }}>{status}</strong>
                </div>
              </div>

              {/* Form Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                
                {/* Project URL Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px' }}>
                  <div>
                    <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#495057' }}>Project URL</label>
                    <p style={{ fontSize: '0.75rem', color: '#adb5bd', marginTop: '4px' }}>Found in Project Settings &gt; API</p>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '12px', top: '10px', color: '#adb5bd' }}>
                      <LinkIcon size={16} />
                    </div>
                    <input 
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://your-project.supabase.co"
                      style={{ 
                        width: '100%', padding: '8px 12px 8px 36px', borderRadius: '4px', backgroundColor: '#fff', 
                        border: '1px solid #dee2e6', color: '#495057', fontSize: '0.9rem', outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* API Key Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px' }}>
                  <div>
                    <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#495057' }}>Anon Key</label>
                    <p style={{ fontSize: '0.75rem', color: '#adb5bd', marginTop: '4px' }}>The public "anon" API Key</p>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '12px', top: '10px', color: '#adb5bd' }}>
                      <ShieldCheck size={16} />
                    </div>
                    <input 
                      type="password"
                      value={anonKey}
                      onChange={(e) => setAnonKey(e.target.value)}
                      placeholder="Paste your anon key here"
                      style={{ 
                        width: '100%', padding: '8px 12px 8px 36px', borderRadius: '4px', backgroundColor: '#fff', 
                        border: '1px solid #dee2e6', color: '#495057', fontSize: '0.9rem', outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Feedback Row */}
                {feedback && (
                  <div style={{ 
                    padding: '12px', borderRadius: '4px', 
                    backgroundColor: feedback.success ? '#f0fdf4' : '#fef2f2', 
                    color: feedback.success ? '#166534' : '#991b1b',
                    fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px'
                  }}>
                    {feedback.success ? <Zap size={14} /> : <AlertCircle size={14} />}
                    {feedback.message}
                  </div>
                )}
              </div>

              {/* Information Section */}
              <div style={{ 
                padding: '24px', backgroundColor: '#f8fafc', borderRadius: '8px', 
                border: '1px solid #e2e8f0', display: 'flex', gap: '16px' 
              }}>
                <Info size={20} color="#3b82f6" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>
                  <strong>Important:</strong> Switching projects will isolate all current table records and app structures. 
                  Ensure that the new project has the required schema for standard work if using templates. 
                  All modifications made here affect the <strong>entire</strong> platform experience for this browser session.
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupabaseSettings;
