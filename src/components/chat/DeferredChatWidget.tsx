'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

/**
 * The chat assistant is a floating button plus a panel — useful, but never part
 * of the first thing a visitor needs. Its chunk and its CMS config request are
 * now deferred to the first idle moment (or 2.5s, whichever comes first), which
 * keeps them off the critical path on a slow phone without changing the widget
 * itself.
 *
 * The launcher is fixed-position, so arriving a moment later shifts nothing.
 */
const ChatWidget = dynamic(() => import('@/components/chat/ChatWidget'), { ssr: false });

export default function DeferredChatWidget() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(() => setReady(true), { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(() => setReady(true), 1800);
    return () => window.clearTimeout(timer);
  }, []);

  return ready ? <ChatWidget /> : null;
}
