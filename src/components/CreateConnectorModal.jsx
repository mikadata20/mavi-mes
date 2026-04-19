import React, { useState } from 'react';
import { 
    X, ChevronRight, ChevronDown, Zap, FilePlus 
} from 'lucide-react';

const CreateConnectorModal = ({ isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: 'My New Connector',
        description: '',
        type: 'HTTP',
        allowCustomSubdomain: false,
        host: 'Cloud Connector Host',
        serverAddress: 'api.weather.gov',
        tls: true,
        useCustomPort: false,
        port: 443,
        databaseName: '',
        username: '',
        password: '',
        supabaseUrl: '',
        supabaseKey: '',
        spreadsheetId: '',
        sheetName: '',
        authType: 'No auth',
        headers: [],
        tlsSettings: { ca: '', certs: '', passphrase: '' },
        mqttSettings: {
            protocol: 'MQTT',
            clientId: '',
            autoGenerateClientId: true,
            keepAlive: 60,
            cleanSession: true,
            qos: 0,
            version: '5.0',
            security: { privateKey: '', cert: '', ca: '', passphrase: '' }
        },
        opcUaSettings: {
            securityPolicy: 'None',
            endpointUrl: '',
            authentication: 'Anonymous'
        },
        modbusSettings: {
            mode: 'TCP',
            ip: '',
            port: 502,
            unitId: 1
        },
        aiSettings: {
            provider: 'OpenAI',
            apiKey: '',
            modelId: 'gpt-4o',
            basePrompt: 'You are a helpful manufacturing assistant. Answers should be safe and concise.'
        }
    });

    const [collapsed, setCollapsed] = useState({
        details: false,
        connection: false,
        auth: false,
        headers: false,
        tls: true
    });

    if (!isOpen) return null;

    const toggleSection = (section) => {
        setCollapsed({ ...collapsed, [section]: !collapsed[section] });
    };

    const handleSave = () => {
        onSave(formData);
        onClose();
    };

    const sectionStyle = {
        borderBottom: '1px solid #f1f5f9',
        padding: '16px 24px'
    };

    const headerStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: 700,
        color: '#1e293b',
        marginBottom: collapsed.details ? 0 : '16px'
    };

    const labelStyle = {
        display: 'block',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: '#64748b',
        marginBottom: '6px'
    };

    const inputStyle = {
        width: '100%',
        padding: '10px 12px',
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        fontSize: '0.9rem',
        outline: 'none',
        transition: 'border-color 0.2s'
    };

    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
            <div style={{ width: '600px', maxHeight: '90vh', backgroundColor: 'white', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                {/* Header */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#001e3c' }}>Create custom connector</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
                </div>

                {/* Form Content */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {/* Details Section */}
                    <div style={sectionStyle}>
                        <div style={headerStyle} onClick={() => toggleSection('details')}>
                            {collapsed.details ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                            Details
                        </div>
                        {!collapsed.details && (
                            <div style={{ display: 'flex', gap: '24px' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div>
                                        <label style={labelStyle}>Name</label>
                                        <input 
                                            style={inputStyle} 
                                            value={formData.name}
                                            onChange={e => setFormData({...formData, name: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Description (Optional)</label>
                                        <input 
                                            style={inputStyle} 
                                            value={formData.description}
                                            onChange={e => setFormData({...formData, description: e.target.value})}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <label style={labelStyle}>Type</label>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                            <input type="radio" checked={formData.type === 'HTTP'} onChange={() => setFormData({...formData, type: 'HTTP'})} />
                                            <div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>HTTP</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Use this to access data from external APIs.</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                            <input type="radio" checked={formData.type === 'SQL'} onChange={() => setFormData({...formData, type: 'SQL'})} />
                                            <div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>SQL</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Use this to access external databases.</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                            <input type="radio" checked={formData.type === 'SUPABASE'} onChange={() => setFormData({...formData, type: 'SUPABASE'})} />
                                            <div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Supabase</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Use this to access Supabase backend services.</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                            <input type="radio" checked={formData.type === 'GOOGLE_SHEETS'} onChange={() => setFormData({...formData, type: 'GOOGLE_SHEETS'})} />
                                            <div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Google Sheets</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Use this to read/write data to Google Sheets.</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                            <input type="radio" checked={formData.type === 'MQTT'} onChange={() => setFormData({...formData, type: 'MQTT'})} />
                                            <div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>MQTT</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Use this to connect to MQTT brokers for machine data.</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                            <input type="radio" checked={formData.type === 'OPC_UA'} onChange={() => setFormData({...formData, type: 'OPC_UA'})} />
                                            <div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>OPC UA</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Industrial interoperability standard. Connect to PLC tags.</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                            <input type="radio" checked={formData.type === 'MODBUS'} onChange={() => setFormData({...formData, type: 'MODBUS'})} />
                                            <div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Modbus TCP</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Legacy industrial protocol. Read/Write registers directly.</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                            <input type="radio" checked={formData.type === 'AI_ASSISTANT'} onChange={() => setFormData({...formData, type: 'AI_ASSISTANT'})} />
                                            <div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>AI Assistant (Copilot)</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Connect to LLMs (OpenAI, Gemini) for smart operator assistance.</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                                        <div 
                                            onClick={() => setFormData({...formData, allowCustomSubdomain: !formData.allowCustomSubdomain})}
                                            style={{ 
                                                width: '36px', height: '18px', borderRadius: '10px', 
                                                backgroundColor: formData.allowCustomSubdomain ? '#3b82f6' : '#cbd5e1', 
                                                position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s'
                                            }}
                                        >
                                            <div style={{ 
                                                width: '14px', height: '14px', borderRadius: '50%', backgroundColor: 'white', 
                                                position: 'absolute', top: '2px', left: formData.allowCustomSubdomain ? '20px' : '2px',
                                                transition: 'left 0.2s'
                                            }}></div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Allow custom subdomain</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Subdomains can be defined in the connector function. This setting is shared across all environments.</div>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ width: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                        <Zap size={32} />
                                    </div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', cursor: 'pointer' }}>Add image</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Connection Section */}
                    <div style={sectionStyle}>
                        <div style={headerStyle} onClick={() => toggleSection('connection')}>
                            {collapsed.connection ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                            Connection
                        </div>
                        {!collapsed.connection && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <label style={labelStyle}>Running on</label>
                                    <select style={inputStyle} value={formData.host} onChange={e => setFormData({...formData, host: e.target.value})}>
                                        <option>Cloud Connector Host</option>
                                        <option>On-Premise Host A</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Server address</label>
                                    <input 
                                        style={inputStyle} 
                                        value={formData.serverAddress}
                                        onChange={e => setFormData({...formData, serverAddress: e.target.value})}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={labelStyle}>TLS</label>
                                    <div style={{ display: 'flex', gap: '20px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                                            <input type="radio" checked={formData.tls} onChange={() => setFormData({...formData, tls: true})} /> Yes
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                                            <input type="radio" checked={!formData.tls} onChange={() => setFormData({...formData, tls: false})} /> No
                                        </label>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={formData.useCustomPort} 
                                        onChange={() => setFormData({...formData, useCustomPort: !formData.useCustomPort})} 
                                    />
                                    <span style={{ fontSize: '0.85rem' }}>Use custom port</span>
                                </div>

                                {formData.type === 'SQL' && (
                                    <>
                                        <div>
                                            <label style={labelStyle}>Database</label>
                                            <input 
                                                style={inputStyle} 
                                                placeholder="e.g. inventory_db"
                                                value={formData.databaseName}
                                                onChange={e => setFormData({...formData, databaseName: e.target.value})}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: '16px' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={labelStyle}>Username</label>
                                                <input 
                                                    style={inputStyle} 
                                                    value={formData.username}
                                                    onChange={e => setFormData({...formData, username: e.target.value})}
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={labelStyle}>Password</label>
                                                <input 
                                                    type="password"
                                                    style={inputStyle} 
                                                    value={formData.password}
                                                    onChange={e => setFormData({...formData, password: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {formData.type === 'SUPABASE' && (
                                    <>
                                        <div>
                                            <label style={labelStyle}>Supabase Project URL</label>
                                            <input 
                                                style={inputStyle} 
                                                placeholder="https://your-project.supabase.co"
                                                value={formData.supabaseUrl}
                                                onChange={e => setFormData({...formData, supabaseUrl: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Supabase API Key (Anon/Service Role)</label>
                                            <input 
                                                type="password"
                                                style={inputStyle} 
                                                placeholder="eyJhbGciOiJIUzI1NiIsInR5..."
                                                value={formData.supabaseKey}
                                                onChange={e => setFormData({...formData, supabaseKey: e.target.value})}
                                            />
                                        </div>
                                    </>
                                )}

                                {formData.type === 'GOOGLE_SHEETS' && (
                                    <>
                                        <div>
                                            <label style={labelStyle}>Spreadsheet ID</label>
                                            <input 
                                                style={inputStyle} 
                                                placeholder="e.g. 1aBCdEfGhIjKlMnOpQrStUvWxYz_1234567890"
                                                value={formData.spreadsheetId}
                                                onChange={e => setFormData({...formData, spreadsheetId: e.target.value})}
                                            />
                                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>Found in the browser URL: docs.google.com/spreadsheets/d/<b>ID</b>/edit</div>
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Default Sheet Name (Optional)</label>
                                            <input 
                                                style={inputStyle} 
                                                placeholder="e.g. Sheet1"
                                                value={formData.sheetName}
                                                onChange={e => setFormData({...formData, sheetName: e.target.value})}
                                            />
                                        </div>
                                    </>
                                )}

                                {formData.type === 'MQTT' && (
                                    <>
                                        <div>
                                            <label style={labelStyle}>Protocol</label>
                                            <select 
                                                style={inputStyle} 
                                                value={formData.mqttSettings.protocol} 
                                                onChange={e => setFormData({
                                                    ...formData, 
                                                    mqttSettings: { ...formData.mqttSettings, protocol: e.target.value }
                                                })}
                                            >
                                                <option>MQTT</option>
                                                <option>MQTTs</option>
                                            </select>
                                        </div>
                                          <div>
                                              <label style={labelStyle}>MQTT Version</label>
                                              <select 
                                                  style={inputStyle} 
                                                  value={formData.mqttSettings.version} 
                                                  onChange={e => setFormData({
                                                      ...formData, 
                                                      mqttSettings: { ...formData.mqttSettings, version: e.target.value }
                                                  })}
                                              >
                                                  <option>3.1.1</option>
                                                  <option>5.0</option>
                                              </select>
                                          </div>
                                      </>
                                  )}

                                  {formData.type === 'OPC_UA' && (
                                      <>
                                          <div>
                                              <label style={labelStyle}>Endpoint URL</label>
                                              <input 
                                                  style={inputStyle} 
                                                  placeholder="opc.tcp://192.168.1.10:4840"
                                                  value={formData.opcUaSettings.endpointUrl}
                                                  onChange={e => setFormData({
                                                      ...formData, 
                                                      opcUaSettings: { ...formData.opcUaSettings, endpointUrl: e.target.value }
                                                  })}
                                              />
                                          </div>
                                          <div>
                                              <label style={labelStyle}>Security Policy</label>
                                              <select 
                                                  style={inputStyle} 
                                                  value={formData.opcUaSettings.securityPolicy}
                                                  onChange={e => setFormData({
                                                      ...formData, 
                                                      opcUaSettings: { ...formData.opcUaSettings, securityPolicy: e.target.value }
                                                  })}
                                              >
                                                  <option>None</option>
                                                  <option>Basic256Sha256 (Sign & Encrypt)</option>
                                                  <option>Basic256 (Sign)</option>
                                              </select>
                                          </div>
                                      </>
                                  )}

                                  {formData.type === 'MODBUS' && (
                                      <>
                                          <div style={{ display: 'flex', gap: '16px' }}>
                                              <div style={{ flex: 2 }}>
                                                  <label style={labelStyle}>IP Address</label>
                                                  <input 
                                                      style={inputStyle} 
                                                      placeholder="192.168.1.50"
                                                      value={formData.modbusSettings.ip}
                                                      onChange={e => setFormData({
                                                          ...formData, 
                                                          modbusSettings: { ...formData.modbusSettings, ip: e.target.value }
                                                      })}
                                                  />
                                              </div>
                                              <div style={{ flex: 1 }}>
                                                  <label style={labelStyle}>Port</label>
                                                  <input 
                                                      type="number"
                                                      style={inputStyle} 
                                                      value={formData.modbusSettings.port}
                                                      onChange={e => setFormData({
                                                          ...formData, 
                                                          modbusSettings: { ...formData.modbusSettings, port: parseInt(e.target.value) }
                                                      })}
                                                  />
                                              </div>
                                          </div>
                                          <div>
                                              <label style={labelStyle}>Unit ID / Slave Address</label>
                                              <input 
                                                  type="number"
                                                  style={inputStyle} 
                                                  value={formData.modbusSettings.unitId}
                                                  onChange={e => setFormData({
                                                      ...formData, 
                                                      modbusSettings: { ...formData.modbusSettings, unitId: parseInt(e.target.value) }
                                                  })}
                                              />
                                          </div>
                                      </>
                                  )}

                                  {formData.type === 'AI_ASSISTANT' && (
                                      <>
                                          <div>
                                              <label style={labelStyle}>AI Provider</label>
                                              <select 
                                                  style={inputStyle} 
                                                  value={formData.aiSettings.provider}
                                                  onChange={e => setFormData({
                                                      ...formData, 
                                                      aiSettings: { ...formData.aiSettings, provider: e.target.value }
                                                  })}
                                              >
                                                  <option>OpenAI</option>
                                                  <option>Anthropic</option>
                                                  <option>Google Gemini</option>
                                                  <option>Local (Ollama/LM Studio)</option>
                                              </select>
                                          </div>
                                          <div>
                                              <label style={labelStyle}>API Key</label>
                                              <input 
                                                  type="password"
                                                  style={inputStyle} 
                                                  placeholder="sk-..."
                                                  value={formData.aiSettings.apiKey}
                                                  onChange={e => setFormData({
                                                      ...formData, 
                                                      aiSettings: { ...formData.aiSettings, apiKey: e.target.value }
                                                  })}
                                              />
                                          </div>
                                          <div>
                                              <label style={labelStyle}>Model ID</label>
                                              <input 
                                                  style={inputStyle} 
                                                  placeholder="gpt-4o, claude-3-sonnet"
                                                  value={formData.aiSettings.modelId}
                                                  onChange={e => setFormData({
                                                      ...formData, 
                                                      aiSettings: { ...formData.aiSettings, modelId: e.target.value }
                                                  })}
                                              />
                                          </div>
                                          <div>
                                              <label style={labelStyle}>Base System Prompt</label>
                                              <textarea 
                                                  style={{ ...inputStyle, minHeight: '80px' }}
                                                  value={formData.aiSettings.basePrompt}
                                                  onChange={e => setFormData({
                                                      ...formData, 
                                                      aiSettings: { ...formData.aiSettings, basePrompt: e.target.value }
                                                  })}
                                              />
                                          </div>
                                      </>
                                  )}
                            </div>
                        )}
                    </div>

                    {/* Authentication Section */}
                    <div style={sectionStyle}>
                        <div style={headerStyle} onClick={() => toggleSection('auth')}>
                            {collapsed.auth ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                            Authentication
                        </div>
                        {!collapsed.auth && (
                            <div>
                                <label style={labelStyle}>Type</label>
                                <select style={inputStyle} value={formData.authType} onChange={e => setFormData({...formData, authType: e.target.value})}>
                                    <option>No auth</option>
                                    <option>Basic Auth</option>
                                    <option>OAuth 2.0 (Bearer token)</option>
                                    <option>OAuth 2.0 (User Credentials)</option>
                                    <option>OAuth 2.0 (Client Credentials)</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Headers Section */}
                    <div style={sectionStyle}>
                        <div style={headerStyle} onClick={() => toggleSection('headers')}>
                            {collapsed.headers ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                            Headers <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 500 }}>(Optional)</span>
                        </div>
                        {!collapsed.headers && (
                            <button style={{ 
                                padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', 
                                backgroundColor: 'white', color: '#1e293b', fontSize: '0.8rem', 
                                fontWeight: 600, cursor: 'pointer' 
                            }}>
                                Add header
                            </button>
                        )}
                    </div>

                    {/* TLS Settings Section */}
                    <div style={{ ...sectionStyle, borderBottom: 'none' }}>
                        <div style={headerStyle} onClick={() => toggleSection('tls')}>
                            {collapsed.tls ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                            TLS settings <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 500 }}>(Optional)</span>
                        </div>
                        {!collapsed.tls && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0' }}>
                                <div>
                                    <label style={labelStyle}>Custom certificate authority</label>
                                    <textarea 
                                        placeholder="Paste PEM formatted key"
                                        style={{ ...inputStyle, minHeight: '80px', fontFamily: 'monospace', fontSize: '0.8rem' }}
                                    ></textarea>
                                    <button style={{ marginTop: '8px', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                                        <FilePlus size={16} /> Choose a file to upload
                                    </button>
                                    <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px', display: 'block' }}>Supported file types: .pem</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontWeight: 600, cursor: 'pointer' }}>Test</button>
                        <button onClick={handleSave} style={{ padding: '8px 24px', borderRadius: '6px', border: 'none', backgroundColor: '#3b82f6', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Create connector</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateConnectorModal;
