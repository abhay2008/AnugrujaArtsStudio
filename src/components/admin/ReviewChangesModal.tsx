'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, CloudUpload, Loader2, ExternalLink } from 'lucide-react';

/** A photo waiting to be published, shown for a last look before committing. */
export interface ReviewDraftPreview {
  id: string;
  previewUrl: string;
  title: string;
  galleryLabel: string;
  price?: string;
  medium?: string;
  /** False for showcase work — reviewed as “not for sale” rather than unpriced. */
  forSale?: boolean;
}

interface ReviewChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  changes: string[];
  isCommitting: boolean;
  commitStatus: string;
  commitUrl?: string;
  /** Optional wording overrides — used by the artwork upload flow. */
  title?: string;
  subtitle?: string;
  confirmLabel?: string;
  /** New photos about to be published, previewed as thumbnails. */
  drafts?: ReviewDraftPreview[];
}

export default function ReviewChangesModal({
  isOpen,
  onClose,
  onConfirm,
  changes,
  isCommitting,
  commitStatus,
  commitUrl,
  title = 'Review Changes',
  subtitle = 'The following modifications will be committed directly to GitHub and updated live.',
  confirmLabel = 'Confirm & Commit to GitHub',
  drafts,
}: ReviewChangesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#1d062e] border border-studio-gold/50 shadow-2xl p-6 text-[#fdf5cf] space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-blippo text-2xl text-[#ffe76c]">{title}</h3>
            <p className="text-sm text-yellow-100/70">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-purple-900/60 text-yellow-200 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New paintings preview */}
        {drafts && drafts.length > 0 && (
          <div className="grid max-h-64 grid-cols-2 gap-3 overflow-y-auto rounded-xl border border-purple-900/50 bg-[#140320] p-3 sm:grid-cols-3">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="overflow-hidden rounded-xl border border-studio-gold/25 bg-[#1d062e]"
              >
                {draft.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={draft.previewUrl}
                    alt={draft.title}
                    className="h-24 w-full bg-black/50 object-cover"
                  />
                ) : null}
                <div className="space-y-0.5 p-2">
                  <p className="truncate text-xs font-bold text-yellow-100" title={draft.title}>
                    {draft.title}
                  </p>
                  <p className="truncate text-[10px] text-yellow-200/60">{draft.galleryLabel}</p>
                  {draft.forSale ? (
                    <p className="text-[10px] font-bold text-emerald-300">
                      {draft.price ? `₹${draft.price}` : 'Price on request'}
                    </p>
                  ) : (
                    <p className="text-[10px] italic text-yellow-200/45">Showcase — not for sale</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Change List — hidden for the upload flow when nothing is staged yet */}
        {(!drafts || drafts.length === 0 || changes.length > 0) && (
        <div className="max-h-60 overflow-y-auto space-y-2 p-3 rounded-xl bg-[#140320] border border-purple-900/50">
          {changes.length === 0 ? (
            <p className="text-sm text-yellow-200/50 italic py-2">No pending modifications detected.</p>
          ) : (
            changes.map((change, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm text-yellow-100/90">
                <CheckCircle className="w-4 h-4 text-studio-gold flex-shrink-0 mt-0.5" />
                <span>{change}</span>
              </div>
            ))
          )}
        </div>
        )}

        {commitUrl && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-between text-sm">
            <span className="text-emerald-300 font-medium">Successfully committed to GitHub!</span>
            <a
              href={commitUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-emerald-200 hover:underline"
            >
              <span>View Commit</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isCommitting}
            className="px-5 py-2 rounded-xl bg-purple-950/80 border border-purple-800 text-yellow-100 hover:bg-purple-900 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isCommitting || (changes.length === 0 && !drafts?.length)}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-black font-bold text-sm shadow-lg disabled:opacity-50"
          >
            {isCommitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Committing...</span>
              </>
            ) : (
              <>
                <CloudUpload className="w-4 h-4" />
                <span>{confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
