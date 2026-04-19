import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Search,
  Zap,
  Save,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Cpu
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getIntegrationConnectors, saveIntegrationConnector } from '../utils/database';

const PROVIDERS = [
  { id: 'Gemini', label: 'Gemini' },
  { id: 'OpenAI', label: 'Openai' },
  { id: 'Groq', label: 'Grok' },
  { id: 'OpenRouter', label: 'Openrouter' },
  { id: 'Ollama', label: 'Local AI (Ollama)' },
  { id: 'Custom', label: 'Custom API' }
];

const TABS = [
  { id: 'ai', label: 'AI Configuration', icon: Settings }
];

const AiSettings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('ai');
  const [activeProvider, setActiveProvider] = useState('Gemini');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [modelId, setModelId] = useState('gemini-1.5-flash-002');
  const [availableModels, setAvailableModels] = useState([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: bool, message: string }
  const [connectorId, setConnectorId] = useState(null);
  const [dbSettings, setDbSettings] = useState(null);
  const [configs, setConfigs] = useState({}); // Stores { apiKey, baseUrl, modelId, availableModels } per provider ID

  useEffect(() => {
    const loadSettings = async () => {
      const all = await getIntegrationConnectors();
      const aiConn = all.find(c => c.type === 'AI_ASSISTANT');
      if (aiConn) {
        setConnectorId(aiConn.id);
        setDbSettings(aiConn.aiSettings);
        setActiveProvider(aiConn.aiSettings?.provider || 'Gemini');
        setApiKey(aiConn.aiSettings?.apiKey || '');
        setBaseUrl(aiConn.aiSettings?.baseUrl || '');
        const mid = aiConn.aiSettings?.modelId || 'gemini-1.5-flash-002';
        setModelId(mid);
        setAvailableModels([{ id: mid, name: mid }]);
        
        // Load the config cache if it exists
        if (aiConn.aiSettings?.configCache) {
          setConfigs(aiConn.aiSettings.configCache);
        } else {
          // Initialize with current active configuration
          setConfigs({
            [aiConn.aiSettings?.provider || 'Gemini']: {
              apiKey: aiConn.aiSettings?.apiKey || '',
              baseUrl: aiConn.aiSettings?.baseUrl || '',
              modelId: mid,
              availableModels: [{ id: mid, name: mid }]
            }
          });
        }
      }
    };
    loadSettings();
  }, []);

  const handleProviderSwitch = (newProviderId) => {
    // 1. Buffer current inputs into the configs map for the OLD provider
    setConfigs(prev => ({
      ...prev,
      [activeProvider]: {
        apiKey,
        baseUrl,
        modelId,
        availableModels
      }
    }));

    // 2. Load inputs for the NEW provider from the configs map (or default)
    const nextConfig = configs[newProviderId] || {
      apiKey: '',
      baseUrl: newProviderId.includes('Ollama') ? 'http://localhost:11434/v1' : '',
      modelId: newProviderId === 'Gemini' ? 'gemini-1.5-flash-002' : 
               newProviderId === 'OpenAI' ? 'gpt-4o' : 
               newProviderId === 'Groq' ? 'llama3-8b-8192' : '',
      availableModels: []
    };

    setActiveProvider(newProviderId);
    setApiKey(nextConfig.apiKey || '');
    setBaseUrl(nextConfig.baseUrl || '');
    setModelId(nextConfig.modelId || '');
    setAvailableModels(nextConfig.availableModels || []);
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      setTestResult({ success: false, message: 'Please enter an API Key first.' });
      return;
    }
    setIsTesting(true);
    setIsFetchingModels(true);
    setTestResult(null);

    try {
      let success = false;
      let errorMsg = '';
      let models = [];

      if (activeProvider === 'Gemini') {
        const listUrl = `https://generativelanguage.googleapis.com/v1/models?key=${trimmedKey}`;
        const listResp = await fetch(listUrl);
        const listData = await listResp.json();
        
        if (listResp.ok && listData.models) {
          success = true;
          models = listData.models
            .filter(m => m.supportedGenerationMethods.includes('generateContent'))
            .map(m => ({ id: m.name.replace('models/', ''), name: m.displayName || m.name }));
        } else {
          errorMsg = listData.error?.message || 'Gemini API: Key verification failed.';
        }
      } else if (activeProvider === 'OpenAI' || activeProvider === 'Groq') {
        const baseUrl = activeProvider === 'Groq' ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1';
        const listResp = await fetch(`${baseUrl}/models`, {
          headers: { 'Authorization': `Bearer ${trimmedKey}` }
        });
        const listData = await listResp.json();
        
        if (listResp.ok && listData.data) {
          success = true;
          models = listData.data.map(m => ({ id: m.id, name: m.id }));
        } else {
          errorMsg = listData.error?.message || listData.message || `${activeProvider} API: Authentication failed. Check your key.`;
        }
      } else if (activeProvider === 'OpenRouter') {
        const listResp = await fetch(`https://openrouter.ai/api/v1/models`, {
          headers: { 'Authorization': `Bearer ${trimmedKey}` }
        });
        const listData = await listResp.json();
        if (listResp.ok && listData.data) {
          success = true;
          models = listData.data.map(m => ({ id: m.id, name: m.name || m.id }));
        } else {
          errorMsg = listData.error?.message || 'OpenRouter API Error';
        }
      } else if (activeProvider === 'Ollama' || activeProvider === 'Custom' || activeProvider === 'Local AI (Ollama)') {
        const targetUrl = baseUrl.trim() || (activeProvider.includes('Ollama') ? 'http://localhost:11434/v1' : '');
        if (!targetUrl) {
          errorMsg = 'Please enter a Base URL for this provider.';
        } else {
          const listResp = await fetch(`${targetUrl.replace(/\/$/, '')}/models`, {
            headers: trimmedKey ? { 'Authorization': `Bearer ${trimmedKey}` } : {}
          });
          const listData = await listResp.json();
          if (listResp.ok && listData.data) {
            success = true;
            models = listData.data.map(m => ({ id: m.id, name: m.id }));
          } else {
            errorMsg = listData.error?.message || 'Custom/Ollama API Error. Check Base URL.';
          }
        }
      } else {
        errorMsg = `${activeProvider} testing not yet fully implemented.`;
      }

      if (success) {
        setAvailableModels(models);
        // If current modelId is not in the list, pick the first one
        if (models.length > 0 && !models.find(m => m.id === modelId)) {
          setModelId(models[0].id);
        }
        setTestResult({ success: true, message: `Connection Successful! ${models.length} models found.` });
      } else {
        setTestResult({ success: false, message: errorMsg });
      }
    } catch (err) {
      setTestResult({ success: false, message: `Network Error: ${err.message}` });
    } finally {
      setIsTesting(false);
      setIsFetchingModels(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const payload = {
      id: connectorId || `conn_ai_${Date.now()}`,
      name: 'Global AI Assistant',
      type: 'AI_ASSISTANT',
      description: `Global AI configuration via ${activeProvider}`,
      aiSettings: {
        provider: activeProvider,
        modelId: modelId,
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim(),
        basePrompt: dbSettings?.basePrompt || 'You are a professional MES assistant helping frontline operators and engineers.',
        configCache: {
          ...configs,
          [activeProvider]: {
            apiKey: apiKey.trim(),
            baseUrl: baseUrl.trim(),
            modelId,
            availableModels
          }
        }
      }
    };

    await saveIntegrationConnector(payload);
    setDbSettings(payload.aiSettings);
    setIsSaving(false);
    // Success feedback could be added here
  };

  return (
    <div style={{ 
      height: '100vh', width: '100%', backgroundColor: '#f8f9fa', color: '#495057', 
      display: 'flex', flexDirection: 'column', fontFamily: "'Inter', system-ui, sans-serif" 
    }}>
      {/* Odoo Navbar - Action Bar (Fixed at top) */}
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
            {isSaving ? 'Saving...' : 'SAVE'}
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
          <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#495057' }}>Settings</h1>
        </div>
        <button 
          onClick={() => navigate(-1)}
          style={{ 
            padding: '8px', borderRadius: '4px', border: 'none', backgroundColor: 'transparent', 
            color: '#adb5bd', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}
        >
          <X size={20} />
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Sidebar */}
        <div style={{ 
          width: '280px', backgroundColor: '#f0f2f5', borderRight: '1px solid #dee2e6', 
          display: 'flex', flexDirection: 'column', padding: '16px 0' 
        }}>
          <div style={{ padding: '0 24px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #dee2e6', marginBottom: '16px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '4px', backgroundColor: '#714B67', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Settings size={18} />
            </div>
            <span style={{ fontSize: '0.950rem', fontWeight: 600, color: '#495057' }}>General Settings</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{ 
                    width: '100%', padding: '10px 24px', border: 'none', background: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '12px', color: isActive ? '#017E84' : '#495057',
                    fontSize: '0.9rem', fontWeight: isActive ? 700 : 500, borderLeft: isActive ? '4px solid #017E84' : '4px solid transparent',
                    backgroundColor: isActive ? '#fff' : 'transparent', textAlign: 'left', transition: 'all 0.1s'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, backgroundColor: '#fff', overflowY: 'auto' }}>
          <div style={{ padding: '32px 48px', maxWidth: '900px' }}>
            {activeTab === 'ai' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                
                {/* Active Info Section */}
                <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#212529', margin: 0 }}>AI Configuration</h2>
                    <p style={{ fontSize: '0.85rem', color: '#6c757d', margin: 0 }}>Configure the primary intelligence engine for the MES platform.</p>
                  </div>
                </div>

                {/* Status Indicator (Odoo small alert style) */}
                <div style={{ 
                  padding: '12px 16px', borderRadius: '4px', border: '1px solid #cce5ff', 
                  backgroundColor: '#f8f9fa', borderLeftWidth: '4px', borderLeftColor: '#017E84',
                  display: 'flex', alignItems: 'center', gap: '12px' 
                }}>
                  <div style={{ color: '#017E84' }}><Cpu size={20} /></div>
                  <div style={{ fontSize: '0.9rem', color: '#495057' }}>
                    <strong style={{ color: '#017E84' }}>{dbSettings?.provider || 'Gemini'}</strong> is currently active using <strong>{dbSettings?.modelId || 'gemini-1.5-flash-002'}</strong>
                  </div>
                </div>

                {/* Settings Grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  
                  {/* Provider Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px' }}>
                    <div>
                      <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#495057' }}>AI Provider</label>
                      <p style={{ fontSize: '0.75rem', color: '#adb5bd', marginTop: '4px' }}>Choose your AI service provider</p>
                    </div>
                    <div style={{ 
                      display: 'flex', gap: '4px', padding: '4px', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #dee2e6' 
                    }}>
                      {PROVIDERS.map(p => {
                        const isActive = activeProvider === p.id;
                        return (
                          <button 
                            key={p.id}
                            onClick={() => handleProviderSwitch(p.id)}
                            style={{ 
                              flex: 1, padding: '6px 12px', borderRadius: '3px', border: 'none',
                              backgroundColor: isActive ? '#017E84' : 'transparent', color: isActive ? '#fff' : '#495057',
                              fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.1s'
                            }}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* API Key Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px' }}>
                    <div>
                      <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#495057' }}>
                        {activeProvider === 'Ollama' || activeProvider.includes('Ollama') ? 'API Key (Optional)' : 'API Key'}
                      </label>
                      <p style={{ fontSize: '0.75rem', color: '#adb5bd', marginTop: '4px' }}>Secret key for authentication</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                          type="password"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder={activeProvider === 'Ollama' || activeProvider.includes('Ollama') ? "Optional" : "Paste your key here"}
                          style={{ 
                            flex: 1, padding: '8px 12px', borderRadius: '4px', backgroundColor: '#fff', 
                            border: '1px solid #dee2e6', color: '#495057', fontSize: '0.9rem', outline: 'none'
                          }}
                        />
                        <button 
                          onClick={handleTestConnection}
                          disabled={isTesting}
                          style={{ 
                            padding: '8px 16px', borderRadius: '4px', backgroundColor: '#e9ecef', color: '#495057', 
                            border: '1px solid #dee2e6', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '6px'
                          }}
                        >
                          {isTesting ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                          {isTesting ? 'Testing...' : 'Test'}
                        </button>
                      </div>
                      
                      {testResult && (
                        <div style={{ 
                          fontSize: '0.8rem', color: testResult.success ? '#157347' : '#bb2d3b', 
                          display: 'flex', alignItems: 'center', gap: '6px' 
                        }}>
                          {testResult.success ? <CheckCircle2 size={14} /> : <X size={14} />}
                          {testResult.message}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Conditional Base URL Row */}
                  {(activeProvider === 'Ollama' || activeProvider === 'Custom' || activeProvider.includes('Ollama')) && (
                    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px' }}>
                      <div>
                        <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#495057' }}>Base URL</label>
                        <p style={{ fontSize: '0.75rem', color: '#adb5bd', marginTop: '4px' }}>Endpoint address</p>
                      </div>
                      <input 
                        type="text"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder={activeProvider.includes('Ollama') ? "http://localhost:11434/v1" : "https://api.your-provider.com/v1"}
                        style={{ 
                          padding: '8px 12px', borderRadius: '4px', backgroundColor: '#fff', 
                          border: '1px solid #dee2e6', color: '#495057', fontSize: '0.9rem', outline: 'none'
                        }}
                      />
                    </div>
                  )}

                  {/* Model Choice Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px' }}>
                    <div>
                      <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#495057' }}>AI Model</label>
                      <p style={{ fontSize: '0.75rem', color: '#adb5bd', marginTop: '4px' }}>Specific model version to use</p>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <select 
                        value={modelId}
                        onChange={(e) => setModelId(e.target.value)}
                        style={{ 
                          width: '100%', padding: '8px 12px', borderRadius: '4px', backgroundColor: '#fff', 
                          border: '1px solid #dee2e6', color: '#495057', fontSize: '0.9rem', outline: 'none',
                          appearance: 'none', cursor: 'pointer'
                        }}
                      >
                        {availableModels.length > 0 ? (
                          availableModels.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))
                        ) : (
                          <option value={modelId}>{modelId}</option>
                        )}
                      </select>
                      <div style={{ 
                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', 
                        pointerEvents: 'none', color: '#adb5bd' 
                      }}>
                        <ChevronRight size={14} style={{ transform: 'rotate(90deg)' }} />
                      </div>
                      <p style={{ fontSize: '0.7rem', color: '#adb5bd', marginTop: '4px' }}>
                        {isFetchingModels ? 'Retrieving available versions...' : availableModels.length > 0 ? `${availableModels.length} models found` : 'Verify connection to see more models'}
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiSettings;
