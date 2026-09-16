import { useEffect, useRef, useState } from 'react';
import { X, Send, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAppStore } from '../../lib/store';
import { API_URL, api } from '../../lib/api';
import Drawer from '../ui/Drawer';
import { LogoMark } from '../ui/Logo';

const SUGGESTIONS = [
  'Am I eligible to donate a kidney?',
  'What does my match score mean?',
  'Which tests do I still need to complete?',
];

export default function ChatDrawer() {
  const { chatOpen, setChatOpen, user, token } = useAppStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Load persisted history the first time the drawer opens
  useEffect(() => {
    if (!chatOpen || messages.length) return;
    api.get('/agents/chat/history')
      .then((res) => setMessages(res.data.map((m) => ({ role: m.role, content: m.content }))))
      .catch(() => {});
    setTimeout(() => inputRef.current?.focus(), 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, streaming]);

  async function send(text) {
    const message = (text ?? input).trim();
    if (!message || streaming) return;

    const history = messages.slice(-10);
    setMessages((m) => [...m, { role: 'user', content: message }, { role: 'assistant', content: '' }]);
    setInput('');
    setStreaming(true);

    try {
      const res = await fetch(`${API_URL}/agents/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message, history }),
      });

      if (!res.ok || !res.body) throw new Error('Chat request failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() || '';
        for (const frame of frames) {
          const line = frame.trim();
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') break;
          try {
            const { token: tok } = JSON.parse(payload);
            if (tok) {
              setMessages((m) => {
                const copy = [...m];
                const last = copy[copy.length - 1];
                copy[copy.length - 1] = { ...last, content: last.content + tok };
                return copy;
              });
            }
          } catch { /* partial JSON — skip */ }
        }
      }
    } catch {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: 'assistant',
          content: 'I could not reach the server just now. Please try again in a moment.',
        };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <Drawer open={chatOpen} onClose={() => setChatOpen(false)} width={420}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-stone-200 shrink-0">
        <div className="flex items-center gap-2.5">
          <LogoMark size={26} />
          <div>
            <p className="text-[14px] font-semibold text-ink leading-tight">DonorBot</p>
            <p className="micro" style={{ fontSize: 9.5 }}>Screening assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              title="Clear conversation"
              className="p-2 rounded-md text-stone-400 hover:text-ink hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <Trash2 size={15} />
            </button>
          )}
          <button
            onClick={() => setChatOpen(false)}
            className="p-2 rounded-md text-stone-400 hover:text-ink hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scroll-thin px-5 py-5 bg-paper">
        {messages.length === 0 ? (
          <div className="pt-8">
            <p className="font-display text-[22px] font-semibold text-ink leading-snug">
              Hello{user?.full_name ? `, ${user.full_name.split(' ')[0].replace(/\(.*\)/, '')}` : ''}.
            </p>
            <p className="mt-2 text-[13.5px] text-stone-500 leading-relaxed">
              I can answer questions about eligibility, screening tests, and your match results.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left px-3.5 py-2.5 rounded-md border border-stone-200 bg-white text-[13px]
                    text-stone-600 hover:border-blood-300 hover:text-ink transition-colors cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex gap-2.5'}>
                {m.role === 'assistant' && <LogoMark size={22} className="mt-0.5" />}
                <div
                  className={
                    m.role === 'user'
                      ? 'max-w-[85%] bg-ink text-white text-[13.5px] leading-relaxed rounded-lg rounded-br-sm px-3.5 py-2.5'
                      : 'max-w-[88%] bg-white border border-stone-200 rounded-lg rounded-tl-sm px-3.5 py-2.5'
                  }
                >
                  {m.role === 'user' ? (
                    m.content
                  ) : (
                    <div className={`md ${streaming && i === messages.length - 1 && m.content ? 'chat-caret' : ''}`}>
                      {m.content ? <ReactMarkdown>{m.content}</ReactMarkdown> : (
                        <span className="inline-flex gap-1 py-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-stone-300 live-dot" />
                          <span className="w-1.5 h-1.5 rounded-full bg-stone-300 live-dot" style={{ animationDelay: '0.2s' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-stone-300 live-dot" style={{ animationDelay: '0.4s' }} />
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-stone-200 p-4 shrink-0 bg-white">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Ask about eligibility, tests, matches…"
            className="flex-1 resize-none h-10 max-h-28 px-3 py-2.5 text-[13.5px] bg-white border border-stone-300 rounded-md
              placeholder:text-stone-400 focus:border-blood-600 focus:ring-2 focus:ring-blood-600/15 focus:outline-none transition-colors"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || streaming}
            className="h-10 w-10 rounded-md bg-blood-600 text-white flex items-center justify-center
              hover:bg-blood-700 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer shrink-0"
          >
            <Send size={15} />
          </button>
        </div>
        <p className="micro mt-2.5" style={{ fontSize: 9 }}>
          Guidance only — always confirm with your transplant team
        </p>
      </div>
    </Drawer>
  );
}
