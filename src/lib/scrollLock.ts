'use client';

import { useEffect } from 'react';

/**
 * Global scroll lock manager.
 * Ensures that when ANY modal, lightbox, or drawer is open:
 * 1. The background screen cannot scroll via mouse wheel, touchpad, or touch gestures.
 * 2. Layout shift from disappearing scrollbars is compensated.
 * 3. Works seamlessly with nested/sequential popups using reference counting.
 */

let lockCount = 0;
let savedHtmlOverflow = '';
let savedBodyOverflow = '';
let savedHtmlOverscroll = '';
let savedBodyOverscroll = '';
let savedPaddingRight = '';

function isScrollableElement(el: HTMLElement | null): boolean {
  let current: HTMLElement | null = el;
  while (current && current !== document.body && current !== document.documentElement) {
    if (current.getAttribute('data-scrollable') === 'true' || current.classList.contains('allow-scroll')) {
      const { overflowY } = window.getComputedStyle(current);
      if (['auto', 'scroll'].includes(overflowY) && current.scrollHeight > current.clientHeight) {
        return true;
      }
    }
    current = current.parentElement;
  }
  return false;
}

function handlePreventWheel(e: WheelEvent) {
  // Allow wheel events if the target is an explicit scrollable container
  if (isScrollableElement(e.target as HTMLElement)) {
    return;
  }
  e.preventDefault();
}

function handlePreventTouch(e: TouchEvent) {
  // If target is inside an explicit scrollable container, allow it
  if (isScrollableElement(e.target as HTMLElement)) {
    return;
  }
  // Otherwise block touchmove to prevent body rubber-banding / scrolling
  if (e.cancelable) {
    e.preventDefault();
  }
}

export function lockScroll() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  if (lockCount === 0) {
    const docEl = document.documentElement;
    const body = document.body;

    savedHtmlOverflow = docEl.style.overflow;
    savedBodyOverflow = body.style.overflow;
    savedHtmlOverscroll = docEl.style.overscrollBehavior;
    savedBodyOverscroll = body.style.overscrollBehavior;
    savedPaddingRight = body.style.paddingRight;

    // Compensate for scrollbar width to prevent page twitching
    const scrollbarWidth = window.innerWidth - docEl.clientWidth;
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    docEl.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    docEl.style.overscrollBehavior = 'none';
    body.style.overscrollBehavior = 'none';

    window.addEventListener('wheel', handlePreventWheel, { passive: false, capture: true });
    window.addEventListener('touchmove', handlePreventTouch, { passive: false, capture: true });
  }

  lockCount++;
}

export function unlockScroll() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  lockCount = Math.max(0, lockCount - 1);

  if (lockCount === 0) {
    const docEl = document.documentElement;
    const body = document.body;

    docEl.style.overflow = savedHtmlOverflow;
    body.style.overflow = savedBodyOverflow;
    docEl.style.overscrollBehavior = savedHtmlOverscroll;
    body.style.overscrollBehavior = savedBodyOverscroll;
    body.style.paddingRight = savedPaddingRight;

    window.removeEventListener('wheel', handlePreventWheel, { capture: true });
    window.removeEventListener('touchmove', handlePreventTouch, { capture: true });
  }
}

/**
 * React hook to lock body & HTML scroll whenever `isLocked` is true.
 */
export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;
    lockScroll();
    return () => {
      unlockScroll();
    };
  }, [isLocked]);
}
