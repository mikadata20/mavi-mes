import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, X, Sparkles, User, Bot, Loader2, Trash2, BrainCircuit, Code, PlusCircle
} from 'lucide-react';
import { getPrimaryAiConnector } from '../utils/database';
import { getLogicAdvice } from '../utils/aiService';

const AiLogicAdvisor = ({ isOpen, onClose, context, onApplyXml, onApplySuggestion }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Halo! Saya Logic Advisor. Ada yang bisa saya bantu dengan logika blok Anda?', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiConnector, setAiConnector] = useState(null);
  const scrollRef = useRef(null);

  const isProviderWithoutApiKey = (provider = '') => {
    const p = String(provider || '').trim().toLowerCase();
    return p.includes('ollama') || p === 'custom';
  };

  useEffect(() => {
    const loadAiConfig = async () => {
      const aiConn = await getPrimaryAiConnector();
      setAiConnector(aiConn);
    };
    if (isOpen) loadAiConfig();
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const parseXmlSuggestions = (text) => {
    if (!text) return [];

    const dedup = new Set();
    const out = [];
    const pushUnique = (raw) => {
      const v = String(raw || '').trim();
      if (!v) return;
      if (dedup.has(v)) return;
      dedup.add(v);
      out.push(v);
    };

    // 1) Preferred wrapper
    const regex = /<block_xml>([\s\S]*?)<\/block_xml>/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      let content = match[1].trim();
      // Remove markdown code blocks if the AI added them
      content = content.replace(/```xml\n?|```\n?/g, '').trim();
      pushUnique(content);
    }

    // 2) Fallback: fenced xml without block_xml wrapper
    const fencedXmlRegex = /```xml\s*([\s\S]*?)```/gi;
    while ((match = fencedXmlRegex.exec(text)) !== null) {
      const content = String(match[1] || '').trim();
      if (content.startsWith('<xml') || content.includes('<block')) {
        pushUnique(content);
      }
    }

    // 3) Fallback: raw xml snippets
    const rawXmlRegex = /(<xml[\s\S]*?<\/xml>)/gi;
    while ((match = rawXmlRegex.exec(text)) !== null) {
      pushUnique(match[1]);
    }

    return out;
  };

  const parseWidgetSuggestions = (text) => {
    if (!text) return [];
    const regex = /<add_widget>([\s\S]*?)<\/add_widget>/gi;
    const out = [];
    let match;
    while ((match = regex.exec(String(text))) !== null) {
      const content = String(match[1] || '').trim();
      if (content) out.push(content);
    }
    return out;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      if (!aiConnector || !aiConnector.aiSettings) {
        throw new Error('AI Connector belum dikonfigurasi. Buka Integrations > AI Settings.');
      }

      const provider = aiConnector.aiSettings?.provider || '';
      const needsApiKey = !isProviderWithoutApiKey(provider);
      if (needsApiKey && !aiConnector.aiSettings?.apiKey) {
        throw new Error(`API Key untuk provider "${provider || 'AI'}" belum diisi.`);
      }
      if (!aiConnector.aiSettings?.modelId) {
        throw new Error('Model AI belum dipilih di AI Settings.');
      }

      const history = messages.slice(-5).map(m => ({ role: m.role, content: m.content }));
      const response = await getLogicAdvice(input, history, context, aiConnector);

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response, 
        timestamp: new Date() 
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${err.message}`, 
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      bottom: '10px',
      width: '380px',
      backgroundColor: 'white',
      borderRadius: '16px',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
      border: '1px solid #e2e8f0',
      zIndex: 2000,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#4f46e5', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} />
          <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>Logic Advisor</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#f9fafb' }}
      >
        {messages.map((msg, idx) => {
          const suggestions = msg.role === 'assistant' ? parseXmlSuggestions(msg.content) : [];
          const widgetSuggestions = msg.role === 'assistant' ? parseWidgetSuggestions(msg.content) : [];
          const cleanContent = msg.content
            .replace(/<block_xml>[\s\S]*?<\/block_xml>/g, '')
            .replace(/<add_widget>[\s\S]*?<\/add_widget>/g, '')
            .trim();

          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{msg.role === 'user' ? 'You' : 'Advisor'}</span>
              </div>
              <div style={{
                maxWidth: '90%',
                padding: '10px 12px',
                borderRadius: msg.role === 'user' ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
                backgroundColor: msg.role === 'user' ? '#4f46e5' : 'white',
                color: msg.role === 'user' ? 'white' : '#1e293b',
                fontSize: '0.8rem',
                lineHeight: 1.4,
                border: msg.role === 'user' ? 'none' : '1px solid #e2e8f0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}>
                {cleanContent || (suggestions.length > 0 || widgetSuggestions.length > 0 ? "I've suggested automation for you:" : "")}
                
                {(suggestions.length > 0 || widgetSuggestions.length > 0) && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {!!onApplySuggestion && (
                      <button
                        onClick={() => onApplySuggestion(msg.content)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          backgroundColor: msg.role === 'user' ? 'rgba(255,255,255,0.2)' : '#ede9fe',
                          color: msg.role === 'user' ? 'white' : '#4f46e5',
                          border: 'none',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <PlusCircle size={14} /> Add Widget + Blocks
                      </button>
                    )}
                    {suggestions.map((xml, sIdx) => (
                      <button 
                        key={sIdx}
                        onClick={() => onApplyXml(xml)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          backgroundColor: msg.role === 'user' ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                          color: msg.role === 'user' ? 'white' : '#4f46e5',
                          border: 'none',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <PlusCircle size={14} /> Add Suggested Blocks
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.7rem' }}>
            <Loader2 className="animate-spin" size={14} />
            <span>Thinking...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: '12px', borderTop: '1px solid #e2e8f0', backgroundColor: 'white' }}>
        <div style={{ position: 'relative' }}>
          <input 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask for logic help..."
            style={{ 
              width: '100%', 
              padding: '10px 40px 10px 12px', 
              borderRadius: '20px', 
              border: '1px solid #e2e8f0',
              backgroundColor: '#f3f4f6',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            style={{ 
              position: 'absolute', 
              right: '6px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              backgroundColor: '#4f46e5',
              color: 'white',
              border: 'none',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              opacity: (input.trim() && !isLoading) ? 1 : 0.5
            }}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiLogicAdvisor;
