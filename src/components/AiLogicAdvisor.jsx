import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, X, Sparkles, User, Bot, Loader2, Trash2, BrainCircuit, Code, PlusCircle
} from 'lucide-react';
import { getIntegrationConnectors } from '../utils/database';
import { getLogicAdvice } from '../utils/aiService';

const AiLogicAdvisor = ({ isOpen, onClose, context, onApplyXml }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Halo! Saya Logic Advisor. Ada yang bisa saya bantu dengan logika blok Anda?', timestamp: new Date() }
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

  const parseXmlSuggestions = (text) => {
    const regex = /<block_xml>([\s\S]*?)<\/block_xml>/g;
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      let content = match[1].trim();
      // Remove markdown code blocks if the AI added them
      content = content.replace(/```xml\n?|```\n?/g, '').trim();
      matches.push(content);
    }
    return matches;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      if (!aiConnector || !aiConnector.aiSettings?.apiKey) {
        throw new Error('AI Connector not configured. Please add an AI Assistant integration.');
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
          const cleanContent = msg.content.replace(/<block_xml>[\s\S]*?<\/block_xml>/g, '').trim();

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
                {cleanContent || (suggestions.length > 0 ? "I've suggested some blocks for you:" : "")}
                
                {suggestions.length > 0 && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
            onKeyPress={e => e.key === 'Enter' && handleSend()}
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
