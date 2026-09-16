import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import { MessageSquare, X, Send, Bot, User, Sparkles, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api } from '../api';

export default function DonorBotChat() {
  const { chatbotOpen, setChatbotOpen, user } = useAppStore();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello ${user?.full_name || 'there'}! 👋 I am **DonorBot**, your AI organ donation assistant. \n\nI can help you understand your medical screening results, Indian transplant guidelines (NOTTO), organ compatibility, eGFR/creatinine values, and HLA typing. How can I assist you today?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!chatbotOpen) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');

    const updatedHistory = [...messages, { role: 'user', content: userMessage }];
    setMessages(updatedHistory);
    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/agents/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          message: userMessage,
          history: updatedHistory.slice(-8),
        }),
      });

      if (!response.ok) throw new Error('Network error');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') break;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.token) {
                assistantMsg += parsed.token;
                setMessages((prev) => {
                  const newArr = [...prev];
                  newArr[newArr.length - 1] = { role: 'assistant', content: assistantMsg };
                  return newArr;
                });
              }
            } catch (err) {}
          }
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'I am currently unable to answer. Please check your connection and try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] h-[520px] glass-panel flex flex-col shadow-2xl border border-cyan-500/30 overflow-hidden animate-in fade-in slide-in-from-bottom-5">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-cyan-950/80 to-slate-900 flex items-center justify-between border-b border-cyan-500/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-spin-slow" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-1.5">
              DonorBot AI
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </h3>
            <span className="text-[10px] text-cyan-400/80 font-mono">DeepSeek • OpenRouter RAG</span>
          </div>
        </div>
        <button
          onClick={() => setChatbotOpen(false)}
          className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-cyan-400" />
              </div>
            )}
            <div
              className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-cyan-600 text-white rounded-br-none'
                  : 'bg-slate-800/90 text-gray-200 border border-white/10 rounded-bl-none shadow-md'
              }`}
            >
              <ReactMarkdown className="prose prose-invert prose-xs max-w-none">
                {msg.content}
              </ReactMarkdown>
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4 text-emerald-400" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono p-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>DonorBot is thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-white/10 bg-slate-900/80 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about eGFR, HLA, NOTTO guidelines..."
          className="glass-input text-xs flex-1 py-2"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="btn-primary p-2 rounded-lg text-xs"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
