'use client';

import { useEffect, type RefObject } from 'react';

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
      const { overflowX, overflowY } = window.getComputedStyle(current);
      if ((['auto', 'scroll'].includes(overflowY) && current.scrollHeight > current.clientHeight) ||
          (['auto', 'scroll'].includes(overflowX) && current.scrollWidth > current.clientWidth)) {
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
  // Native multi-touch is needed by zoomable lightboxes.
  if (e.touches.length > 1) return;
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

  if (lockCount === 0) return;
  lockCount--;

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

/** Trap focus in a body-level drawer/dialog and return it to its opener. */
export function useDialogFocus(ref: RefObject<HTMLElement | null>, open: boolean) {
  useEffect(() => {
    if (!open || !ref.current) return;
    const previous = document.activeElement as HTMLElement | null;
    const root = ref.current;
    const controls = () => Array.from(root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]')).filter((el) => el.getClientRects().length > 0);
    controls()[0]?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = controls();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus({ preventScroll: true }); };
  }, [open, ref]);
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
