'use client';

import React from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import type { ArtItem } from '@/lib/types';

interface DeleteArtworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  artwork: ArtItem | null;
  galleryLabel: string;
}

export default function DeleteArtworkModal({
  isOpen,
  onClose,
  onConfirm,
  artwork,
  galleryLabel,
}: DeleteArtworkModalProps) {
  if (!isOpen || !artwork) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl bg-[#1d062e] border border-red-500/50 shadow-2xl p-6 text-[#fdf5cf] space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-6 h-6" />
            <h3 className="font-blippo text-2xl text-red-300">Delete Artwork</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-purple-900/60 text-yellow-200 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-yellow-100/80">
            Are you sure you want to remove <strong className="text-white">&quot;{artwork.title}&quot;</strong> from the{' '}
            <span className="text-studio-gold font-bold">{galleryLabel}</span> gallery?
          </p>
          <p className="text-xs text-red-300/80 bg-red-950/40 p-2.5 rounded-lg border border-red-900/40">
            This will take effect immediately upon committing changes to GitHub.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-purple-950 border border-purple-800 text-yellow-100 hover:bg-purple-900 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
