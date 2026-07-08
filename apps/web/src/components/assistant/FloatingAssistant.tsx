import { BadgeCheck, Bot, Image, Mic, Send, Sparkles, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { api } from '@/services/api';
import { useUiStore } from '@/store/uiStore';

const suggestedPrompts = [
  'Summarize project health',
  'Find documentation gaps',
  'Draft release notes',
  'Show API performance'
];

const initialMessages = [
  {
    role: 'assistant',
    content:
      'Hi, I am the SK Central assistant. I only answer questions about SK Central applications, analytics, and documentation.'
  }
];

export function FloatingAssistant() {
  const open = useUiStore((state) => state.assistantOpen);
  const setOpen = useUiStore((state) => state.setAssistantOpen);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(initialMessages);
  const [typing, setTyping] = useState(false);

  const send = async (value = input) => {
    if (!value.trim()) return;
    setMessages((current) => [...current, { role: 'user', content: value }]);
    setInput('');
    setTyping(true);
    try {
      const response = await api.post('/ai/chat', { prompt: value });
      setTyping(false);
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: response.data.data.content
        }
      ]);
    } catch {
      setTyping(false);
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content:
            'I could not reach the AI service. Check that the API is running and `GEMINI_API_KEY` is configured if you want live Gemini responses.'
        }
      ]);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 z-30 inline-flex h-13 w-13 items-center justify-center rounded-2xl bg-slate-950 p-4 text-white shadow-[0_20px_50px_rgba(15,23,42,0.22)] transition hover:scale-105 hover:bg-cyan-600"
        aria-label="Open AI assistant"
      >
        <Bot size={24} />
      </button>
      <button
        type="button"
        className="group fixed bottom-8 right-5 z-30 inline-flex h-13 w-13 items-center justify-center overflow-hidden rounded-2xl bg-white p-4 text-slate-950 shadow-[0_20px_50px_rgba(15,23,42,0.16)] transition-all duration-300 hover:w-72 hover:justify-start hover:gap-3"
        aria-label="Developed by Samaksh Rastogi"
      >
        <BadgeCheck size={22} className="text-cyan-600" />
        <span className="hidden whitespace-nowrap text-sm font-black group-hover:inline">Developed by Samaksh Rastogi</span>
      </button>
      <AnimatePresence>
        {open ? (
          <motion.section
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            className="fixed bottom-40 right-4 z-40 flex h-[620px] max-h-[calc(100vh-10rem)] w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden rounded-3xl glass"
            role="dialog"
            aria-label="SK Central AI assistant"
          >
            <header className="flex items-center justify-between border-b border-slate-900/10 p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-100 text-cyan-700">
                  <Sparkles size={18} />
                </span>
                <div>
                  <h2 className="font-bold text-slate-950">AI Assistant</h2>
                  <p className="text-xs text-slate-500">Gemini scoped to SK Central</p>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <X size={18} />
              </button>
            </header>
            <div className="flex flex-wrap gap-2 border-b border-slate-900/10 p-3">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => send(prompt)}
                  className="rounded-full border border-slate-900/10 bg-white/70 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-cyan-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <div className="scrollbar-soft flex-1 space-y-4 overflow-y-auto p-4">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={message.role === 'user' ? 'ml-auto max-w-[82%]' : 'mr-auto max-w-[88%]'}
                >
                  <div
                    className={
                      message.role === 'user'
                        ? 'rounded-2xl bg-slate-950 px-4 py-3 text-sm text-white'
                        : 'rounded-2xl border border-slate-900/10 bg-white/75 px-4 py-3 text-sm leading-6 text-slate-700'
                    }
                  >
                    <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{message.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
              {typing ? <p className="text-sm text-slate-500">Assistant is typing...</p> : null}
            </div>
            <footer className="border-t border-slate-900/10 p-3">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-900/10 bg-white/75 p-2">
                <button type="button" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Upload image placeholder">
                  <Image size={18} />
                </button>
                <button type="button" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Voice input placeholder">
                  <Mic size={18} />
                </button>
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') send();
                  }}
                  placeholder="Ask about projects, docs, analytics..."
                  className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-950 placeholder:text-slate-400 focus:ring-0"
                />
                <button type="button" onClick={() => void send()} className="rounded-xl bg-cyan-500 p-2 text-white" aria-label="Send message">
                  <Send size={18} />
                </button>
              </div>
            </footer>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </>
  );
}
