'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, X, Send, Sparkles, Square } from 'lucide-react';
import { createSseParser, type SseEvent } from './sse';
import { MAX_SESSION_MESSAGES } from '@/lib/chatbot/guardrails';
import { useChatNudge } from './useChatNudge';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  pending?: boolean;
  /** Local error notice — never sent back to the API as conversation history. */
  error?: boolean;
  /** WhatsApp deep link (prefilled message) from the reply's meta event. */
  wa?: string;
  /** Google Maps place link (directions) from the reply's meta event. */
  maps?: string;
  /** Studio CMS image to show as a thumbnail card above the reply. */
  image?: string;
  /** Which layer answered (preprogrammed/faq/cached/llm/guardrail). */
  layer?: string;
}

interface ChatbotConfig {
  enabled: boolean;
  welcomeMessage: string;
  suggestedPrompts: string[];
}

const WHATSAPP_URL = 'https://wa.me/919849238464';

/** Shown when the CMS doesn't define suggested prompts — guide visitors to
 *  the cheap, well-answered paths (preprogrammed layer, zero LLM cost). */
const DEFAULT_CHIPS = ['What paintings are for sale?', 'What classes do you offer?', 'How much is painting 7?'];

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

  // Ambient invite bubble that occasionally pops out of the launcher.
  const { nudge, clear: clearNudge } = useChatNudge();

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const openRef = useRef(false);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

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

  const stoppedRef = useRef(false);

  const stop = useCallback(() => {
    stoppedRef.current = true;
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
      // Error/pending bubbles are local UI state only — the API must receive
      // a clean conversation, or it would echo our own error copy back.
      const history = [...messages.filter((m) => !m.pending && !m.error), userMsg];
      setMessages([...history, { role: 'assistant', content: '', pending: true }]);
      setInput('');
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;
      stoppedRef.current = false;
      // Dead-stream guard: if the server never completes, stop hanging and
      // surface a helpful message instead of an endless spinner.
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, 60000);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // The server caps the conversation at MAX_SESSION_MESSAGES; sending
          // more would be rejected with "Invalid conversation length" — so
          // trim here. The model only receives the last few turns anyway.
          body: JSON.stringify({
            messages: history.slice(-MAX_SESSION_MESSAGES).map(({ role, content }) => ({ role, content })),
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          setMessages((prev) => [
            ...prev.filter((m) => !m.pending),
            { role: 'assistant', content: err.error || 'Something went wrong — please try again!', error: true },
          ]);
          setStreaming(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        const parser = createSseParser((ev: SseEvent) => {
          const data = JSON.parse(ev.data) as { text?: string; model?: string; layer?: string; wa?: string; image?: string; maps?: string };
          if (ev.event === 'meta') {
            // Structured reply metadata: which layer answered, WhatsApp
            // deep link, painting thumbnail, maps directions. Attaches to
            // the pending bubble.
            const { wa, image, maps, layer } = data;
            if (wa || image || maps || layer) {
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === 'assistant' && last.pending) {
                  next[next.length - 1] = { ...last, wa, image, maps, layer };
                }
                return next;
              });
            }
          } else if (ev.event === 'delta' && data.text) {
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
            // Reply landed while the panel was closed → nudge with the dot.
            if (!openRef.current) setUnread(true);
          }
        });

        let chunk;
        while (!(chunk = await reader.read()).done) {
          parser.push(decoder.decode(chunk.value, { stream: true }));
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          if (timedOut) {
            setMessages((prev) => [
              ...prev.filter((m) => !m.pending),
              {
                role: 'assistant',
                content: 'Chitra is taking longer than usual to reply — please try again in a moment, or WhatsApp the studio directly! 🙏',
                error: true,
              },
            ]);
          }
          // User-initiated stop: the finally block cleans up the empty bubble.
        } else {
          setMessages((prev) => [
            ...prev.filter((m) => !m.pending),
            { role: 'assistant', content: 'The connection dropped — please try that again! 🙏', error: true },
          ]);
        }
      } finally {
        clearTimeout(timeout);
        setStreaming(false);
        abortRef.current = null;
        setMessages((prev) => {
          const cleared = prev.map((m) => ({ ...m, pending: false }));
          // A stream that never produced text leaves an empty bubble: remove
          // it when the user pressed Stop, else show a graceful fallback.
          return cleared.flatMap((m) => {
            if (m.role === 'assistant' && !m.error && m.content.trim() === '') {
              if (stoppedRef.current) return [];
              return [{ ...m, content: 'Hmm, the reply got lost on its way here. Please ask again — or WhatsApp the studio! 🎨', error: true }];
            }
            return [m];
          });
        });
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

  /** Clear the nudge the moment the chat opens; chips come back on reopen. */
  const toggleChat = useCallback(() => {
    setOpen((v) => {
      if (!v) clearNudge();
      return !v;
    });
    setShowChips(true);
    setUnread(false);
  }, [clearNudge]);

  if (!mounted || !config.enabled) return null;

  const chatPanel = (
    <div
      role="dialog"
      aria-label="Chat with Chitra, the studio assistant"
      className="chat-panel fixed z-[60] flex flex-col overflow-hidden rounded-3xl border border-studio-gold/30 bg-[#160523]/98 shadow-2xl backdrop-blur-xl
                 inset-x-3 bottom-3 max-h-[min(78dvh,620px)] h-[min(78dvh,620px)]
                 sm:inset-x-auto sm:bottom-40 sm:right-6 sm:w-[min(calc(100vw-3rem),400px)] sm:h-[min(72dvh,580px)] sm:max-h-[calc(100dvh-11rem)]"
      style={{ boxShadow: '0 0 40px rgba(242,215,112,0.15), 0 20px 60px rgba(0,0,0,0.6)' }}
    >
      {/* Header — deep-plum → sunset gradient sheen */}
      <div className="chat-header relative flex items-center gap-3 border-b border-studio-gold/20 px-4 py-3.5">
        <span className="chat-avatar relative flex h-10 w-10 items-center justify-center rounded-full shadow-md">
          <Sparkles className="h-5 w-5 text-purple-950" />
          <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-[#1d062e]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-blippo text-base leading-none text-[#ffe76c]">Chitra</p>
          <p className="mt-1.5 text-[11px] font-medium tracking-wide text-emerald-300/90">Online · replies instantly</p>
        </div>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Chat on WhatsApp instead"
          className="rounded-lg border border-emerald-500/40 bg-emerald-900/40 px-2.5 py-1.5 text-[11px] font-bold text-emerald-200 transition-colors hover:bg-emerald-800/60"
        >
          WhatsApp
        </a>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close chat"
          className="rounded-lg p-2 text-yellow-100/70 transition-all hover:rotate-90 hover:bg-purple-900/60 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="chat-scroll flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`chat-msg flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`chat-bubble max-w-[86%] px-4 py-3 text-[14px] leading-relaxed sm:text-[14.5px] ${
                m.role === 'user'
                  ? 'chat-bubble--user chat-bubble--gold font-medium text-purple-950'
                  : 'chat-bubble--bot border border-studio-gold/20 text-yellow-50'
              }`}
            >
              {m.image && !m.pending && (
                <a
                  href="/sale"
                  className="mb-2.5 block overflow-hidden rounded-xl border border-studio-gold/25"
                  title="View in the sale gallery"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.image} alt="Painting thumbnail" className="h-36 w-full object-cover" loading="lazy" />
                </a>
              )}
              {m.content ? (
                <>
                  {renderRich(m.content)}
                  {m.pending && <span className="chat-caret" aria-hidden />}
                </>
              ) : m.pending ? (
                <span className="chat-typing flex items-center gap-1 py-0.5" aria-label="Chitra is typing">
                  <span className="chat-dot" />
                  <span className="chat-dot" style={{ animationDelay: '0.15s' }} />
                  <span className="chat-dot" style={{ animationDelay: '0.3s' }} />
                </span>
              ) : null}
              {m.wa && !m.pending && (
                <a
                  href={m.wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2.5 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-emerald-500"
                >
                  <MessageCircle className="h-4 w-4" />
                  Continue on WhatsApp
                </a>
              )}
              {m.maps && !m.pending && (
                <a
                  href={m.maps}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-studio-gold/40 bg-purple-900/60 px-3 py-2 text-[12.5px] font-bold text-yellow-100 transition-colors hover:bg-purple-800"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
                  </svg>
                  Get Directions
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Suggested prompts — docked above the input like a quick-reply bar.
          Always in the same place, never interleaved with the transcript. */}
      {showChips && (
        <div className="chat-chip-dock border-t border-studio-gold/15 px-3 pb-2 pt-2.5">
          <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-bold tracking-[0.14em] text-studio-gold/70 uppercase">
            <Sparkles className="h-3 w-3" aria-hidden />
            Try asking
          </p>
          <div className="chat-chip-row flex gap-2 overflow-x-auto pb-1">
            {(config.suggestedPrompts.length > 0 ? config.suggestedPrompts : DEFAULT_CHIPS).slice(0, 6).map((p, i) => (
              <button
                key={p}
                onClick={() => void send(p)}
                style={{ animationDelay: `${0.15 + i * 0.06}s` }}
                className="chat-chip shrink-0 whitespace-nowrap rounded-full border border-studio-gold/30 px-3.5 py-2 text-[12px] font-medium text-yellow-100/90 transition-all hover:-translate-y-0.5 hover:border-studio-gold/70 hover:bg-purple-900 hover:text-white hover:shadow-[0_4px_14px_rgba(242,215,112,0.18)] active:scale-95"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={submit} className="chat-input-bar flex items-center gap-2 border-t border-studio-gold/20 px-3 py-3">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about art, prices, classes…"
          maxLength={1000}
          aria-label="Type your message"
          className="min-w-0 flex-1 rounded-xl border border-studio-gold/30 bg-purple-950/50 px-4 py-3 text-[14px] text-yellow-50 placeholder-yellow-100/35 transition-colors focus:border-studio-gold/70 focus:bg-purple-950/80 focus:outline-none focus:shadow-[0_0_0_3px_rgba(242,215,112,0.12)]"
        />
        {streaming ? (
          <button
            type="button"
            onClick={stop}
            aria-label="Stop generating"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-studio-gold/40 bg-purple-900/70 text-yellow-100 shadow-md transition-all hover:bg-purple-800 active:scale-95"
          >
            <Square className="h-4 w-4 fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            aria-label="Send message"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 text-purple-950 shadow-md transition-all hover:scale-105 hover:from-amber-400 hover:to-yellow-400 hover:shadow-[0_4px_16px_rgba(242,215,112,0.35)] active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
          >
            <Send className="h-5 w-5" />
          </button>
        )}
      </form>
    </div>
  );

  return (
    <>
      {open && createPortal(chatPanel, document.body)}
      {/* Contextual invite bubble — pops out of the launcher, never blocks it.
          The wrapper is pointer-events-none so it can never eat a tap meant
          for the FAB; only the bubble itself is clickable (opens the chat). */}
      {!open && nudge && (
        <div className="chat-nudge-wrap pointer-events-none fixed bottom-20 right-4 z-[59] sm:bottom-[10.5rem] sm:right-6">
          <button
            type="button"
            onClick={toggleChat}
            className="chat-nudge pointer-events-auto flex max-w-[240px] items-start gap-2 rounded-2xl rounded-br-sm border border-studio-gold/35 px-3.5 py-2.5 text-left text-[12.5px] font-medium leading-snug text-yellow-50 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, rgba(45,12,70,0.92), rgba(26,6,43,0.94))',
              boxShadow: '0 10px 30px rgba(0,0,0,0.45), 0 0 18px rgba(242,215,112,0.14)',
            }}
          >
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-studio-gold" aria-hidden />
            <span>{nudge}</span>
          </button>
          <span className="chat-nudge-tail" aria-hidden />
        </div>
      )}
      <button
        onClick={toggleChat}
        aria-label={open ? 'Close chat' : 'Chat with the studio assistant'}
        aria-expanded={open}
        className="chat-fab fixed bottom-5 right-4 z-[59] flex h-14 w-14 items-center justify-center rounded-full border border-studio-gold/50 bg-gradient-to-br from-purple-800 via-purple-900 to-[#2a0a3f] shadow-2xl transition-all hover:scale-110 hover:border-studio-gold active:scale-95 sm:bottom-24 sm:right-6 motion-reduce:hover:scale-100"
        style={{ boxShadow: '0 0 24px rgba(242,215,112,0.25), 0 8px 30px rgba(0,0,0,0.5)' }}
      >
        <span className={`transition-transform duration-300 ${open ? 'rotate-90 scale-75' : 'rotate-0 scale-100'}`}>
          {open ? <X className="h-6 w-6 text-studio-gold" /> : <MessageCircle className="h-6 w-6 text-studio-gold" />}
        </span>
        {!open && unread && (
          <span className="chat-unread absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full bg-red-500 ring-2 ring-purple-950" />
        )}
        {!open && (
          <span className="absolute inset-0 -z-10 animate-pulse-slow rounded-full bg-studio-gold/20 blur-md" aria-hidden />
        )}
      </button>
    </>
  );
}
