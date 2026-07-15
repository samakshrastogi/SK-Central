import { BadgeCheck, Bot, Send, Sparkles, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/services/api';
import { useUiStore } from '@/store/uiStore';

const suggestedPrompts = [
  'Summarize live SK Central applications',
  'List live applications by status',
  'Which application was updated most recently?',
  'Which SK application should I use for my goal?'
];

const initialMessages = [
  {
    role: 'assistant',
    content:
      'Hi, I am the SK Central assistant. I answer from the live public application catalog. Admin-only data is never available to me.'
  }
];

export function FloatingAssistant() {
  const open = useUiStore((state) => state.assistantOpen);
  const setOpen = useUiStore((state) => state.setAssistantOpen);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(initialMessages);
  const [typing, setTyping] = useState(false);
  const [developerOpen, setDeveloperOpen] = useState(false);
  const developerCreditRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (developerOpen && !developerCreditRef.current?.contains(event.target as Node)) setDeveloperOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [developerOpen]);

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
            'Live SK Central application data is temporarily unavailable. Please try again shortly; I will not invent an answer without current catalog data.'
        }
      ]);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-36 right-3 z-30 sm:bottom-20 sm:right-5 inline-flex h-13 w-13 items-center justify-center rounded-2xl bg-slate-950 p-4 text-white shadow-[0_20px_50px_rgba(15,23,42,0.22)] transition hover:scale-105 hover:bg-cyan-600"
        aria-label="Open AI assistant"
      >
        <Bot size={24} />
      </button>
      <div ref={developerCreditRef} className="group fixed bottom-20 right-3 z-30 flex items-center justify-end sm:bottom-4 sm:right-5">
        <a
          href="https://www.linkedin.com/in/samaksh-rastogi-9638b9254/"
          target="_blank"
          rel="noreferrer"
          className={`${developerOpen ? 'inline-flex' : 'hidden group-hover:inline-flex group-focus-within:inline-flex'} items-center rounded-l-2xl bg-white py-3 pl-4 pr-2 text-slate-950 shadow-[0_20px_50px_rgba(15,23,42,0.16)]`}
          aria-label="Samaksh Rastogi on LinkedIn"
        >
          <span className="whitespace-nowrap text-sm font-black">Developed by <span className="text-emerald-600 underline decoration-2 underline-offset-2">Samaksh Rastogi</span></span>
        </a>
        <button
          type="button"
          onClick={() => setDeveloperOpen((current) => !current)}
          className={`${developerOpen ? 'rounded-r-2xl' : 'rounded-2xl group-hover:rounded-l-none group-focus-within:rounded-l-none'} grid h-12 w-12 place-items-center bg-white text-cyan-600 shadow-[0_20px_50px_rgba(15,23,42,0.16)] transition hover:text-cyan-700`}
          aria-label={developerOpen ? 'Hide developer information' : 'Show developer information'}
          aria-expanded={developerOpen}
        >
          <BadgeCheck size={23} />
        </button>
      </div>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-950/15 backdrop-blur-[2px]"
            onMouseDown={() => setOpen(false)}
          >          <motion.section
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            className="absolute inset-x-3 bottom-24 flex h-[min(620px,calc(100dvh-8rem))] max-h-[calc(100dvh-8rem)] flex-col overflow-hidden rounded-3xl glass sm:inset-x-auto sm:right-4 sm:w-[calc(100vw-2rem)] sm:max-w-md"
            onMouseDown={(event) => event.stopPropagation()}
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
                  <p className="text-xs text-slate-500">Live public SK Central data</p>
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
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') send();
                  }}
                  placeholder="Ask about live SK Central applications..."
                  className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-950 placeholder:text-slate-400 focus:ring-0"
                />
                <button type="button" onClick={() => void send()} className="rounded-xl bg-cyan-500 p-2 text-white" aria-label="Send message">
                  <Send size={18} />
                </button>
              </div>
            </footer>
          </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}



