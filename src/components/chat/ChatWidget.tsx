'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, X, Send, Sparkles, Loader2 } from 'lucide-react';
import { createSseParser, type SseEvent } from './sse';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  pending?: boolean;
}

interface ChatbotConfig {
  enabled: boolean;
  welcomeMessage: string;
  suggestedPrompts: string[];
}

const WHATSAPP_URL = 'https://wa.me/919611255949';

/** Bold segments (**…**) and internal links within one line — no HTML injection. */
function boldify(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(\/[^)]*\))/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-studio-gold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    const link = part.match(/^\[([^\]]+)\]\((\/[^)]*)\)$/);
    if (link) {
      return (
        <a
          key={i}
          href={link[2]}
          className="font-semibold text-studio-gold underline decoration-studio-gold/50 underline-offset-2 hover:decoration-studio-gold"
        >
          {link[1]}
        </a>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

/**
 * Render the model's light markdown (paragraphs, bullet/numbered lists,
 * **bold**) safely. Markdown tables from the model degrade to plain lines.
 */
function renderRich(text: string): React.ReactNode {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];
  let ordered = false;

  const flushList = (key: string) => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul
        key={key}
        className={`my-1 ml-4 space-y-0.5 ${ordered ? 'list-decimal' : 'list-disc'}`}
      >
        {listItems.map((li, i) => (
          <li key={i} className="pl-0.5">
            {boldify(li)}
          </li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((raw, i) => {
    const line = raw.trim();
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet) {
      if (ordered) flushList(`l${i}`);
      ordered = false;
      listItems.push(bullet[1]);
      return;
    }
    if (numbered) {
      if (!ordered) flushList(`l${i}`);
      ordered = true;
      listItems.push(numbered[1]);
      return;
    }
    flushList(`l${i}`);
    if (!line) return;
    blocks.push(
      <p key={`p${i}`} className={i > 0 ? 'mt-1.5' : ''}>
        {boldify(line)}
      </p>
    );
  });
  flushList('end');

  return <>{blocks}</>;
}

export default function ChatWidget() {
  const [config, setConfig] = useState<ChatbotConfig>({
    enabled: true,
    welcomeMessage: "Namaste! I'm Chitra, the studio's AI assistant. Ask me about paintings, prices, classes or workshops! 🎨",
    suggestedPrompts: [],
  });
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [unread, setUnread] = useState(false);
  const [showChips, setShowChips] = useState(true);
  const [greeted, setGreeted] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load CMS config once.
  useEffect(() => {
    setMounted(true);
    fetch('/api/content', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.chatbot) {
          setConfig({
            enabled: data.chatbot.enabled !== false,
            welcomeMessage: data.chatbot.welcomeMessage || config.welcomeMessage,
            suggestedPrompts: Array.isArray(data.chatbot.suggestedPrompts) ? data.chatbot.suggestedPrompts : [],
          });
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Greet on first open (per browser session).
  useEffect(() => {
    if (open && !greeted) {
      let restored: ChatMsg[] | null = null;
      try {
        const saved = sessionStorage.getItem('chitra_history');
        if (saved) restored = JSON.parse(saved) as ChatMsg[];
      } catch {}
      if (restored && restored.length > 0) {
        setMessages(restored);
      } else {
        setMessages([{ role: 'assistant', content: config.welcomeMessage }]);
      }
      setGreeted(true);
    }
  }, [open, greeted, config.welcomeMessage]);

  // Persist history per session + autoscroll.
  useEffect(() => {
    if (messages.length > 0) {
      try {
        sessionStorage.setItem('chitra_history', JSON.stringify(messages.slice(-40)));
      } catch {}
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streaming]);

  // ESC to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

      setShowChips(false);
      const userMsg: ChatMsg = { role: 'user', content: trimmed };
      const history = [...messages.filter((m) => !m.pending), userMsg];
      setMessages([...history, { role: 'assistant', content: '', pending: true }]);
      setInput('');
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          setMessages((prev) => [
            ...prev.filter((m) => !m.pending),
            { role: 'assistant', content: err.error || 'Something went wrong — please try again!' },
          ]);
          setStreaming(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        const parser = createSseParser((ev: SseEvent) => {
          const data = JSON.parse(ev.data) as { text?: string; model?: string };
          if (ev.event === 'delta' && data.text) {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === 'assistant' && last.pending) {
                next[next.length - 1] = { ...last, content: last.content + data.text! };
              } else {
                next.push({ role: 'assistant', content: data.text! });
              }
              return next;
            });
          } else if (ev.event === 'replace' && data.text) {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === 'assistant') {
                next[next.length - 1] = { ...last, content: data.text!, pending: false };
              }
              return next;
            });
          } else if (ev.event === 'done') {
            setMessages((prev) => prev.map((m) => ({ ...m, pending: false })));
          }
        });

        let chunk;
        while (!(chunk = await reader.read()).done) {
          parser.push(decoder.decode(chunk.value, { stream: true }));
        }
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) {
          setMessages((prev) => [
            ...prev.filter((m) => !m.pending),
            { role: 'assistant', content: 'The connection dropped — please try that again! 🙏' },
          ]);
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
        setMessages((prev) => prev.map((m) => ({ ...m, pending: false })));
      }
    },
    [messages, streaming]
  );

  const submit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      void send(input);
    },
    [send, input]
  );

  if (!mounted || !config.enabled) return null;

  const chatPanel = (
    <div
      role="dialog"
      aria-label="Chat with Chitra, the studio assistant"
      className="fixed z-[60] flex flex-col overflow-hidden rounded-3xl border border-studio-gold/30 bg-[#160523]/98 shadow-2xl backdrop-blur-xl
                 bottom-24 right-4 w-[min(calc(100vw-2rem),380px)] h-[min(70dvh,560px)]
                 sm:bottom-24 sm:right-6"
      style={{ boxShadow: '0 0 40px rgba(242,215,112,0.15), 0 20px 60px rgba(0,0,0,0.6)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-studio-gold/20 bg-gradient-to-r from-purple-900/80 via-[#1d062e] to-amber-900/40 px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-400 shadow-md">
          <Sparkles className="h-4 w-4 text-purple-950" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-blippo text-sm leading-none text-[#ffe76c]">Chitra</p>
          <p className="mt-1 text-[10px] text-yellow-100/60">Studio assistant · AI-powered</p>
        </div>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Chat on WhatsApp instead"
          className="rounded-lg border border-emerald-500/40 bg-emerald-900/40 px-2 py-1 text-[10px] font-bold text-emerald-200 hover:bg-emerald-800/60"
        >
          WhatsApp
        </a>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close chat"
          className="rounded-lg p-1.5 text-yellow-100/70 hover:bg-purple-900/60 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                m.role === 'user'
                  ? 'rounded-br-md bg-gradient-to-br from-amber-500 to-yellow-500 font-medium text-purple-950'
                  : 'rounded-bl-md border border-studio-gold/20 bg-purple-950/70 text-yellow-50'
              }`}
            >
              {m.content ? renderRich(m.content) : m.pending ? (
                <span className="flex items-center gap-1.5 py-0.5 text-yellow-100/50">
                  <Loader2 className="h-3 w-3 animate-spin" /> thinking…
                </span>
              ) : null}
            </div>
          </div>
        ))}

        {showChips && config.suggestedPrompts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {config.suggestedPrompts.slice(0, 6).map((p) => (
              <button
                key={p}
                onClick={() => void send(p)}
                className="rounded-full border border-studio-gold/30 bg-purple-950/60 px-3 py-1.5 text-[11px] text-yellow-100/80 transition-all hover:border-studio-gold/60 hover:bg-purple-900 hover:text-white active:scale-95"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-studio-gold/20 bg-[#1d062e]/90 px-3 py-3">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about art, prices, classes…"
          maxLength={1000}
          aria-label="Type your message"
          className="min-w-0 flex-1 rounded-xl border border-studio-gold/30 bg-purple-950/50 px-3.5 py-2.5 text-[13px] text-yellow-50 placeholder-yellow-100/30 focus:border-studio-gold/70 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || streaming}
          aria-label="Send message"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 text-purple-950 shadow-md transition-all hover:from-amber-400 hover:to-yellow-400 disabled:opacity-40"
        >
          {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );

  return (
    <>
      {open && createPortal(chatPanel, document.body)}
      <button
        onClick={() => {
          setOpen((v) => {
            if (!v) setUnread(false);
            return !v;
          });
        }}
        aria-label={open ? 'Close chat' : 'Chat with the studio assistant'}
        aria-expanded={open}
        className="fixed bottom-6 right-4 z-[59] flex h-14 w-14 items-center justify-center rounded-full border border-studio-gold/50 bg-gradient-to-br from-purple-800 via-purple-900 to-[#2a0a3f] shadow-2xl transition-transform hover:scale-105 active:scale-95 sm:right-6 motion-reduce:hover:scale-100"
        style={{ boxShadow: '0 0 24px rgba(242,215,112,0.25), 0 8px 30px rgba(0,0,0,0.5)' }}
      >
        {open ? (
          <X className="h-6 w-6 text-studio-gold" />
        ) : (
          <MessageCircle className="h-6 w-6 text-studio-gold" />
        )}
        {!open && unread && <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full bg-red-500 ring-2 ring-purple-950" />}
        {!open && (
          <span className="absolute inset-0 -z-10 animate-pulse-slow rounded-full bg-studio-gold/20 blur-md" aria-hidden />
        )}
      </button>
    </>
  );
}
