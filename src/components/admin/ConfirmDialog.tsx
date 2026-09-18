'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, X } from 'lucide-react';

/**
 * The console's own confirmation dialog.
 *
 * Destructive actions used to call `window.confirm`, which blocks the page's
 * main thread, cannot be styled, and is silently suppressed by browsers after a
 * few repeats — at which point Delete simply stopped working with no feedback.
 * This renders inside the page instead, so it behaves identically everywhere the
 * console runs (including embedded preview panes where a native dialog may not
 * be answerable at all).
 */
export interface ConfirmOptions {
  title: string;
  message: React.ReactNode;
  /** Defaults to "Delete" with the danger styling. */
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` (default) for deletions, `default` for reversible actions. */
  tone?: 'danger' | 'default';
}

interface ConfirmDialogProps extends ConfirmOptions {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onCancel]);

  if (!isOpen || typeof document === 'undefined') return null;

  const Icon = tone === 'danger' ? Trash2 : AlertTriangle;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md space-y-4 rounded-2xl border border-studio-gold/50 bg-[#1d062e] p-5 text-[#fdf5cf] shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
              tone === 'danger'
                ? 'border-red-900/60 bg-red-950/60 text-red-300'
                : 'border-studio-gold/40 bg-purple-950/60 text-studio-gold'
            }`}
          >
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-blippo text-lg text-[#ffe76c]">{title}</h3>
            <p className="mt-1 text-sm text-yellow-100/75">{message}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close dialog"
            className="rounded-lg p-1 text-yellow-200 hover:bg-purple-900/60 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-purple-800/60 bg-purple-950/60 px-4 py-2 text-sm font-semibold text-yellow-100/80 transition-colors hover:border-studio-gold/40 hover:text-white"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-bold text-black shadow-lg transition-all ${
              tone === 'danger'
                ? 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-400 hover:to-rose-400'
                : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * `const { confirm, dialog } = useConfirm()` then
 * `if (await confirm({ title, message })) doIt()`.
 *
 * Promise-based so a call site reads like the `window.confirm` it replaced.
 * Render `{dialog}` anywhere in the component's JSX.
 */
export function useConfirm() {
  const [request, setRequest] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setRequest(options);
    });
  }, []);

  const settle = useCallback((confirmed: boolean) => {
    resolver.current?.(confirmed);
    resolver.current = null;
    setRequest(null);
  }, []);

  const dialog = request ? (
    <ConfirmDialog
      isOpen
      {...request}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  ) : null;

  return { confirm, dialog };
}
