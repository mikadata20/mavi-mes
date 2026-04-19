import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  X, 
  Sparkles, 
  User, 
  Bot, 
  Loader2,
  Trash2,
  BrainCircuit,
  Settings
} from 'lucide-react';
import { getIntegrationConnectors } from '../utils/database';

const FrontlineCopilot = ({ isOpen, onClose, appContext, selectedApp }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Halo! Saya Frontline Copilot. Ada yang bisa saya bantu dengan pekerjaan Anda hari ini?', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiConnector, setAiConnector] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const loadAiConfig = async () => {
      const allConnectors = await getIntegrationConnectors();
      const aiConn = allConnectors.find(c => c.type === 'AI_ASSISTANT');
      setAiConnector(aiConn);
    };
    if (isOpen) loadAiConfig();
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Logic for real AI call would go here using aiConnector
      // For now, we simulate a smart response based on context
      await new Promise(r => setTimeout(r, 1500));
      
      let responseContent = "Maaf, saya sedang dalam mode simulasi. Harap konfigurasi konektor AI di modul Integrasi.";
      
      if (!aiConnector || !aiConnector.aiSettings?.apiKey) {
        responseContent = "Konektor AI belum dikonfigurasi sepenuhnya. Buka 'Integrations' lalu tambah konektor 'AI Assistant' dengan API Key Anda.";
      } else {
        // Simulated smart response
        const lowerInput = input.toLowerCase();
        const currentStep = (selectedApp?.config?.steps || [])[appContext.currentStepIndex]?.title || 'Langkah Saat Ini';
        
        if (lowerInput.includes('bagaimana') || lowerInput.includes('cara') || lowerInput.includes('bantu')) {
          responseContent = `Tentu! Untuk langkah "${currentStep}", pastikan Anda mengikuti SOP dengan teliti. Jika ada masalah pada mesin, harap lapor melalui sistem Andon. Apa ada detail spesifik yang ingin Anda tanyakan?`;
        } else if (lowerInput.includes('oee') || lowerInput.includes('performa')) {
          responseContent = `Performa mesin saat ini terpantau stabil. Pastikan input hasil produksi dicatat tepat waktu agar kalkulasi OEE akurat.`;
        } else {
          responseContent = `Saya mengerti pertanyaan Anda mengenai "${input}". Sebagai asisten manufaktur, saya menyarankan Anda untuk memeriksa manual mesin jika ada kendala teknis.`;
        }
      }

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: responseContent, 
        timestamp: new Date() 
      }]);
    } catch (err) {
      console.error('Copilot Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '24px',
      bottom: '24px',
      width: '400px',
      backgroundColor: 'white',
      borderRadius: '16px',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
      border: '1px solid #e2e8f0',
      zIndex: 1000,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#0f172a', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ backgroundColor: 'rgba(59,130,246,0.2)', padding: '8px', borderRadius: '10px' }}>
            <Sparkles size={20} color="#60a5fa" />
          </div>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>Frontline Copilot</div>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <BrainCircuit size={10} /> {aiConnector ? `${aiConnector.aiSettings?.provider} (${aiConnector.aiSettings?.modelId})` : 'System Simulation'}
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}>
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#f8fafc' }}
      >
        {messages.map((msg, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              {msg.role === 'assistant' ? <Bot size={14} color="#64748b" /> : <User size={14} color="#64748b" />}
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{msg.role === 'user' ? 'You' : 'Copilot'}</span>
            </div>
            <div style={{
              maxWidth: '85%',
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
              backgroundColor: msg.role === 'user' ? '#3b82f6' : 'white',
              color: msg.role === 'user' ? 'white' : '#1e293b',
              fontSize: '0.85rem',
              lineHeight: 1.5,
              border: msg.role === 'user' ? 'none' : '1px solid #e2e8f0',
              boxShadow: msg.role === 'user' ? '0 4px 6px -1px rgba(59, 130, 246, 0.2)' : '0 2px 4px rgba(0,0,0,0.02)'
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.8rem' }}>
            <Loader2 className="animate-spin" size={16} />
            <span>Copilot sedang berpikir...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', backgroundColor: 'white' }}>
        <div style={{ position: 'relative' }}>
          <input 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSend()}
            placeholder="Ketik pesan..."
            style={{ 
              width: '100%', 
              padding: '12px 44px 12px 16px', 
              borderRadius: '24px', 
              border: '1px solid #e2e8f0',
              backgroundColor: '#f1f5f9',
              fontSize: '0.9rem',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            style={{ 
              position: 'absolute', 
              right: '8px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: (input.trim() && !isLoading) ? 'pointer' : 'default',
              opacity: (input.trim() && !isLoading) ? 1 : 0.5,
              transition: 'all 0.2s'
            }}
          >
            <Send size={16} />
          </button>
        </div>
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Settings size={12} /> Terhubung ke {selectedApp?.name || 'Aplikasi'}
          </div>
          <button onClick={() => setMessages([{ role: 'assistant', content: 'Riwayat percakapan dibersihkan.', timestamp: new Date() }])} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Trash2 size={12} /> Bersihkan
          </button>
        </div>
      </div>
    </div>
  );
};

export default FrontlineCopilot;
