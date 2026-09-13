'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Loader2,
  Plus,
  CloudUpload,
  CheckCheck,
  Tag,
  Sparkles,
} from 'lucide-react';
import { useSite } from '@/context/SiteContext';
import { GALLERY_DEFINITIONS, GalleryKey, ArtItem } from '@/lib/types';
import { optimizeImageForUpload } from '@/lib/imageOptimize';
import ReviewChangesModal from './ReviewChangesModal';

interface BatchDraft {
  tempId: string;
  file: File;
  previewUrl: string;
  title: string;
  category: string;
  price: string;
  targetGallery: GalleryKey;
  optimizedPromise?: Promise<{ dataUrl: string; filename: string }>;
  precomputedDataUrl?: string;
  precomputedFilename?: string;
  status: 'idle' | 'uploading' | 'done' | 'error';
  errorMessage?: string;
}

export default function MassUploadStudio() {
  const { uploadFile, appendArtwork, save, getPendingChanges, editor } = useSite();
  const [drafts, setDrafts] = useState<BatchDraft[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [commitStatus, setCommitStatus] = useState('');
  const [bulkGallery, setBulkGallery] = useState<GalleryKey>('sale');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const currentDefaultGallery = bulkGallery;
    const defaultDef = GALLERY_DEFINITIONS.find((d) => d.key === currentDefaultGallery);

    const nextDrafts: BatchDraft[] = Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .map((file, idx) => {
        const previewUrl = URL.createObjectURL(file);
        const baseTitle = file.name
          .replace(/\.[^.]+$/, '')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());

        const optPromise = optimizeImageForUpload(file, previewUrl);

        return {
          tempId: `upload-${Date.now()}-${idx}`,
          file,
          previewUrl,
          title: baseTitle || 'Original Artwork',
          category: defaultDef?.defaultCategory || 'Paintings for Sale',
          price: '',
          targetGallery: currentDefaultGallery,
          optimizedPromise: optPromise,
          status: 'idle',
        };
      });

    nextDrafts.forEach((draft) => {
      draft.optimizedPromise?.then((res) => {
        setDrafts((prev) =>
          prev.map((d) =>
            d.tempId === draft.tempId
              ? {
                  ...d,
                  precomputedDataUrl: res.dataUrl,
                  precomputedFilename: res.filename,
                }
              : d
          )
        );
      });
    });

    setDrafts((prev) => [...prev, ...nextDrafts]);
  };

  const applyBulkGalleryToAll = (newGallery: GalleryKey) => {
    setBulkGallery(newGallery);
    const def = GALLERY_DEFINITIONS.find((d) => d.key === newGallery);
    setDrafts((prev) =>
      prev.map((d) =>
        d.status !== 'done'
          ? {
              ...d,
              targetGallery: newGallery,
              category: def?.defaultCategory || d.category,
            }
          : d
      )
    );
  };

  const handleUploadAll = async () => {
    if (drafts.length === 0) return;
    setIsProcessing(true);

    for (const draft of drafts) {
      if (draft.status === 'done') continue;

      setDrafts((prev) =>
        prev.map((d) => (d.tempId === draft.tempId ? { ...d, status: 'uploading' } : d))
      );

      try {
        const uploadedUrl = await uploadFile(draft.file, {
          precomputedDataUrl: draft.precomputedDataUrl,
          precomputedFilename: draft.precomputedFilename,
          previewUrl: draft.previewUrl,
        });

        const newArtItem: ArtItem = {
          id: `art-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          src: uploadedUrl,
          title: draft.title.trim() || 'Original Artwork',
          category: draft.category.trim() || 'Paintings for Sale',
          price: draft.price.trim() || undefined,
          dateAdded: new Date().toISOString(),
        };

        appendArtwork(draft.targetGallery, newArtItem);

        setDrafts((prev) =>
          prev.map((d) => (d.tempId === draft.tempId ? { ...d, status: 'done' } : d))
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setDrafts((prev) =>
          prev.map((d) => (d.tempId === draft.tempId ? { ...d, status: 'error', errorMessage: msg } : d))
        );
      }
    }

    setIsProcessing(false);
  };

  const removeDraft = (tempId: string) => {
    setDrafts((prev) => {
      const target = prev.find((d) => d.tempId === tempId);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((d) => d.tempId !== tempId);
    });
  };

  const clearCompleted = () => {
    setDrafts((prev) => prev.filter((d) => d.status !== 'done'));
  };

  const clearAllDrafts = () => {
    drafts.forEach((d) => {
      if (d.previewUrl) URL.revokeObjectURL(d.previewUrl);
    });
    setDrafts([]);
  };

  const handleCommit = async () => {
    try {
      setCommitStatus('Saving to repository…');
      await save();
      setReviewOpen(false);
    } catch (e) {
      setCommitStatus('Commit failed.');
    }
  };

  const pendingCount = drafts.filter((d) => d.status !== 'done').length;
  const doneCount = drafts.filter((d) => d.status === 'done').length;

  return (
    <div className="space-y-8">
      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-8 md:p-12 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-yellow-300 bg-purple-950/80 scale-[1.01] shadow-[0_0_25px_rgba(242,215,112,0.3)]'
            : 'border-studio-gold/40 bg-[#190626]/80 hover:border-studio-gold hover:bg-[#200830] shadow-xl'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="max-w-lg mx-auto space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-studio-purple/80 border border-studio-gold/60 flex items-center justify-center text-studio-gold shadow-xl group-hover:scale-110 transition-transform">
            <Upload className="w-8 h-8 animate-bounce" />
          </div>
          <h3 className="font-blippo text-2xl md:text-3xl text-[#ffe76c]">
            Drop Artworks or Click to Select
          </h3>
          <p className="text-xs md:text-sm text-yellow-100/70">
            Batch-upload paintings directly from your phone, iPad, or desktop. Canvas-first
            WebP/JPEG pre-compression ensures photos are optimized with zero quality degradation.
          </p>
          <div className="inline-flex items-center gap-2 pt-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-800 text-[11px] font-mono text-yellow-200/80">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Supported: JPEG, PNG, WebP, AVIF, HEIC</span>
          </div>
        </div>
      </div>

      {/* Batch Drafts List */}
      {drafts.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-900 pb-3">
            <div>
              <h3 className="font-blippo text-xl text-[#fdf5cf] flex items-center gap-2">
                <span>Upload Queue ({drafts.length} Artwork{drafts.length > 1 ? 's' : ''})</span>
                {doneCount > 0 && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-700/50">
                    {doneCount} published
                  </span>
                )}
              </h3>
              <p className="text-xs text-yellow-100/60 mt-0.5">
                Configure artwork title, gallery category, and pricing before publishing.
              </p>
            </div>

            {/* Bulk Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Quick Set Destination */}
              <div className="flex items-center gap-1.5 bg-[#190626] border border-studio-gold/30 rounded-xl px-2.5 py-1">
                <Tag className="w-3.5 h-3.5 text-studio-gold" />
                <span className="text-[11px] text-yellow-200/60 font-semibold">Default Gallery:</span>
                <select
                  value={bulkGallery}
                  onChange={(e) => applyBulkGalleryToAll(e.target.value as GalleryKey)}
                  className="bg-transparent text-xs text-yellow-100 font-bold focus:outline-none cursor-pointer"
                >
                  {GALLERY_DEFINITIONS.map((def) => (
                    <option key={def.key} value={def.key} className="bg-[#190626] text-yellow-100">
                      {def.label}
                    </option>
                  ))}
                </select>
              </div>

              {doneCount > 0 && (
                <button
                  type="button"
                  onClick={clearCompleted}
                  className="text-xs text-yellow-200 hover:text-white underline font-medium"
                >
                  Clear Finished
                </button>
              )}

              {drafts.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllDrafts}
                  className="text-xs text-red-300/70 hover:text-red-300 underline font-medium"
                >
                  Discard All
                </button>
              )}

              <button
                type="button"
                onClick={handleUploadAll}
                disabled={isProcessing || pendingCount === 0}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 text-black font-extrabold text-sm shadow-lg hover:from-amber-400 hover:to-yellow-400 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Publishing Queue...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Publish {pendingCount} Artwork{pendingCount > 1 ? 's' : ''}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {drafts.map((draft) => (
              <div
                key={draft.tempId}
                className={`flex gap-4 p-4 rounded-2xl bg-[#1a0528] border transition-all relative ${
                  draft.status === 'done'
                    ? 'border-emerald-500/50 bg-emerald-950/20'
                    : draft.status === 'error'
                    ? 'border-red-500/50 bg-red-950/20'
                    : 'border-studio-gold/30 hover:border-studio-gold/60 shadow-lg'
                }`}
              >
                {/* Artwork Preview */}
                <div className="relative w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-black/50 border border-purple-900">
                  <Image
                    src={draft.previewUrl}
                    alt={draft.title}
                    fill
                    className="object-cover"
                  />
                  {draft.status === 'done' && (
                    <div className="absolute inset-0 bg-emerald-950/85 backdrop-blur-xs flex flex-col items-center justify-center text-emerald-400 gap-1 animate-fadeIn">
                      <CheckCircle2 className="w-7 h-7" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Added</span>
                    </div>
                  )}
                  {draft.status === 'uploading' && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-yellow-300 gap-1">
                      <Loader2 className="w-7 h-7 animate-spin" />
                      <span className="text-[10px] font-bold">Uploading</span>
                    </div>
                  )}
                </div>

                {/* Artwork Form Fields */}
                <div className="flex-1 space-y-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-yellow-200/60">
                      Artwork Title
                    </label>
                    <input
                      type="text"
                      value={draft.title}
                      disabled={draft.status === 'done'}
                      onChange={(e) =>
                        setDrafts((prev) =>
                          prev.map((d) => (d.tempId === draft.tempId ? { ...d, title: e.target.value } : d))
                        )
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#270b3b] border border-studio-gold/30 text-yellow-100 text-xs focus:outline-none focus:border-yellow-300 disabled:opacity-60"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-yellow-200/60">
                        Gallery
                      </label>
                      <select
                        value={draft.targetGallery}
                        disabled={draft.status === 'done'}
                        onChange={(e) =>
                          setDrafts((prev) =>
                            prev.map((d) =>
                              d.tempId === draft.tempId
                                ? { ...d, targetGallery: e.target.value as GalleryKey }
                                : d
                            )
                          )
                        }
                        className="w-full px-2 py-1.5 rounded-lg bg-[#270b3b] border border-studio-gold/30 text-yellow-100 text-xs focus:outline-none disabled:opacity-60 cursor-pointer"
                      >
                        {GALLERY_DEFINITIONS.map((def) => (
                          <option key={def.key} value={def.key} className="bg-[#190626]">
                            {def.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-yellow-200/60">
                        Price (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="₹3,500"
                        value={draft.price}
                        disabled={draft.status === 'done'}
                        onChange={(e) =>
                          setDrafts((prev) =>
                            prev.map((d) => (d.tempId === draft.tempId ? { ...d, price: e.target.value } : d))
                          )
                        }
                        className="w-full px-2 py-1.5 rounded-lg bg-[#270b3b] border border-studio-gold/30 text-yellow-100 text-xs focus:outline-none disabled:opacity-60"
                      />
                    </div>
                  </div>

                  {draft.errorMessage && (
                    <p className="text-[11px] text-red-400">{draft.errorMessage}</p>
                  )}
                </div>

                {/* Remove Draft */}
                {draft.status !== 'done' && (
                  <button
                    type="button"
                    onClick={() => removeDraft(draft.tempId)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg text-yellow-300/40 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Save & Commit Bar */}
      {editor.dirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 px-6 py-3 rounded-2xl bg-[#1b0629]/95 border-2 border-studio-gold shadow-[0_0_30px_rgba(242,215,112,0.4)] backdrop-blur-xl animate-slideUp">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-sm font-bold text-yellow-200">
              {getPendingChanges().length} unsaved modification{getPendingChanges().length > 1 ? 's' : ''} ready to publish
            </span>
          </div>

          <button
            type="button"
            onClick={() => setReviewOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-sm shadow-md transition-all cursor-pointer"
          >
            <CloudUpload className="w-4 h-4" />
            <span>Review &amp; Commit to GitHub</span>
          </button>
        </div>
      )}

      {/* Review Changes Modal */}
      <ReviewChangesModal
        isOpen={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onConfirm={handleCommit}
        changes={getPendingChanges()}
        isCommitting={editor.saving}
        commitStatus={commitStatus}
        commitUrl={editor.commitUrl}
      />
    </div>
  );
}
