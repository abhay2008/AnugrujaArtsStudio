'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  Crop,
  ImagePlus,
  Loader2,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useSite } from '@/context/SiteContext';
import {
  GALLERY_CATALOG,
  GalleryKey,
  ArtItem,
  SiteContent,
  galleryCatalogEntry,
  suggestGalleryFromFilename,
} from '@/lib/types';
import { optimizeImageForUpload } from '@/lib/imageOptimize';
import { framingChangesThePhoto, type Framing } from '@/lib/photoFraming';
import ReviewChangesModal, { ReviewDraftPreview } from './ReviewChangesModal';
import ArtworkFramer, { type FramedResult } from './ArtworkFramer';

/**
 * One photo waiting to be described and published.
 *
 * Photos are picked first (many at once is fine), then described **one at a
 * time** while the painting fills the left half of the screen, exactly like
 * flipping through an album. Nothing is uploaded until the admin publishes.
 */
interface UploadDraft {
  tempId: string;
  file: File;
  previewUrl: string;
  title: string;
  category: string;
  categoryTouched: boolean;
  description: string;
  price: string;
  medium: string;
  dimensions: string;
  targetGallery: GalleryKey;
  /**
   * Is this painting for sale? True only for the commerce collection, where a
   * price is meaningful. Showcase galleries never ask for one.
   */
  forSale: boolean;
  /** Acquisition badge — only collected (and published) when for sale. */
  sellStatus: 'Available' | 'Reserved' | 'Sold';
  /** The showcase gallery to come back to when “Just show it” is picked again. */
  showcaseGallery: GalleryKey;
  /** How the gallery was chosen, so the UI can explain the suggestion. */
  gallerySource: 'filename' | 'default' | 'manual';
  /** Details confirmed with “Save details & next photo”. */
  described: boolean;
  /** Background canvas pre-compression, started the moment the file lands. */
  optimizedPromise?: Promise<{ dataUrl: string; filename: string }>;
  precomputedDataUrl?: string;
  precomputedFilename?: string;
  /** Crop / rotate / straighten the admin applied in the framer. */
  framing?: Framing;
  /** The framed export. Takes precedence over the untrimmed original. */
  framedDataUrl?: string;
  framedFilename?: string;
}

/**
 * The commerce collection — the one place a price is meaningful, because it is
 * the only place the public site renders one. Set by the catalog, not hardcoded.
 */
const SALE_GALLERY: GalleryKey = GALLERY_CATALOG.find((g) => g.sellable)?.key ?? 'sale';

/** Showcase collections: display only, so no price is ever asked for them. */
const SHOWCASE_GALLERIES = GALLERY_CATALOG.filter((g) => !g.sellable);

/** Where a painting lands when nobody said otherwise — never the sale catalog. */
const SHOWCASE_DEFAULT: GalleryKey = SHOWCASE_GALLERIES[0]?.key ?? 'featured';

type Busy = 'idle' | 'single' | 'batch';
type SellStatus = UploadDraft['sellStatus'];

interface StatusNote {
  tone: 'ok' | 'error' | 'info';
  text: string;
}

/** Prepend freshly published artwork so it shows first in its collection. */
function withNewArtworks(
  base: SiteContent,
  entries: { gallery: GalleryKey; item: ArtItem }[]
): SiteContent {
  const galleries = { ...base.galleries };
  entries.forEach(({ gallery, item }) => {
    galleries[gallery] = [item, ...(galleries[gallery] || [])];
  });
  return { ...base, galleries };
}

export default function MassUploadStudio() {
  const { content, uploadFile, save, getPendingChanges, editor } = useSite();
  const [drafts, setDrafts] = useState<UploadDraft[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [busy, setBusy] = useState<Busy>('idle');
  const [status, setStatus] = useState<StatusNote | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [commitStatus, setCommitStatus] = useState('');
  /** tempId of the photo currently open in the framer, if any. */
  const [framingId, setFramingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftsRef = useRef<UploadDraft[]>([]);
  const contentRef = useRef<SiteContent>(content);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

  // Blob previews are ours to clean up.
  useEffect(
    () => () => {
      draftsRef.current.forEach((draft) => {
        try {
          URL.revokeObjectURL(draft.previewUrl);
        } catch {}
      });
    },
    []
  );

  const active = drafts[activeIndex];
  const activeDef = active ? galleryCatalogEntry(active.targetGallery) : null;
  const stillToDescribe = drafts.filter((d) => !d.described).length;
  // Everything in the queue is always part of the next publish — there is no
  // tick to remember. Removing a photo from the queue is the only exclusion.
  const forSaleCount = drafts.filter((d) => d.forSale).length;

  const openPicker = () => fileInputRef.current?.click();

  /** Step 1 — the picker. Adds the chosen photos to the describe queue. */
  const addFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;

    // Anything without a filename hint lands beside the previous photo, or in a
    // showcase collection. It deliberately no longer defaults to the sale
    // catalog: most uploads are not for sale, and being asked for a price was
    // the wrong first question.
    const fallbackGallery = draftsRef.current.at(-1)?.targetGallery ?? SHOWCASE_DEFAULT;

    const added: UploadDraft[] = Array.from(fileList)
      .filter(
        (file) => file.type.startsWith('image/') || /\.(jpe?g|png|webp|avif|gif|heic|heif)$/i.test(file.name)
      )
      .map((file, idx) => {
        let previewUrl = '';
        try {
          previewUrl = URL.createObjectURL(file);
        } catch (e) {
          console.warn('Could not create a preview for', file.name, e);
        }

        const suggested = suggestGalleryFromFilename(file.name);
        const targetGallery = suggested ?? fallbackGallery;
        const def = galleryCatalogEntry(targetGallery);
        const forSale = targetGallery === SALE_GALLERY;

        return {
          tempId: `up-${Date.now()}-${idx}`,
          file,
          previewUrl,
          title: file.name
            .replace(/\.[^.]+$/, '')
            .replace(/[-_]+/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase())
            .slice(0, 80),
          category: def.defaultCategory,
          categoryTouched: false,
          description: '',
          price: '',
          medium: '',
          dimensions: '',
          targetGallery,
          forSale,
          sellStatus: 'Available',
          showcaseGallery: forSale ? SHOWCASE_DEFAULT : targetGallery,
          gallerySource: suggested ? 'filename' : 'default',
          described: false,
          optimizedPromise: optimizeImageForUpload(file, previewUrl),
        };
      });

    if (added.length === 0) {
      setStatus({ tone: 'error', text: 'Those files are not images — pick JPG, PNG, WebP or HEIC.' });
      return;
    }

    // Pre-compress in the background while the admin types.
    added.forEach((draft) => {
      draft.optimizedPromise
        ?.then((res) => {
          setDrafts((prev) =>
            prev.map((d) =>
              d.tempId === draft.tempId
                ? { ...d, precomputedDataUrl: res.dataUrl, precomputedFilename: res.filename }
                : d
            )
          );
        })
        .catch((err) => console.warn('Pre-compression fallback for', draft.file.name, err));
    });

    // Focus the first newly added photo, which is the one needing attention.
    setActiveIndex(draftsRef.current.length);
    setDrafts((prev) => [...prev, ...added]);
    setStatus({
      tone: 'info',
      text: `${added.length} photo${added.length > 1 ? 's' : ''} added. Describe each one, then publish.`,
    });
  };

  const patchDraft = (tempId: string, patch: Partial<UploadDraft>) => {
    setDrafts((prev) => prev.map((d) => (d.tempId === tempId ? { ...d, ...patch } : d)));
  };

  /**
   * Flip a photo between “for sale” and “just show it”. The two are one
   * decision, because the sale page is the only place a price is displayed: a
   * priced painting therefore has to live in the sale catalog, and anything
   * else is a showcase piece. Switching back restores the gallery the admin
   * was using, so the toggle is never destructive.
   */
  const setSaleIntent = (draft: UploadDraft, forSale: boolean) => {
    if (forSale === draft.forSale) return;
    const nextGallery = forSale ? SALE_GALLERY : draft.showcaseGallery || SHOWCASE_DEFAULT;
    const def = galleryCatalogEntry(nextGallery);
    patchDraft(draft.tempId, {
      forSale,
      targetGallery: nextGallery,
      showcaseGallery: forSale ? draft.showcaseGallery || SHOWCASE_DEFAULT : nextGallery,
      gallerySource: 'manual',
      category: draft.categoryTouched ? draft.category : def.defaultCategory,
      described: false,
    });
  };

  const removeDraft = (tempId: string) => {
    const current = draftsRef.current;
    const target = current.find((d) => d.tempId === tempId);
    if (target?.previewUrl) {
      try {
        URL.revokeObjectURL(target.previewUrl);
      } catch {}
    }
    const nextCount = current.length - 1;
    setActiveIndex((prev) => Math.max(0, Math.min(prev, nextCount - 1)));
    setDrafts((prev) => prev.filter((d) => d.tempId !== tempId));
  };

  const discardAll = () => {
    draftsRef.current.forEach((d) => {
      try {
        URL.revokeObjectURL(d.previewUrl);
      } catch {}
    });
    setDrafts([]);
    setActiveIndex(0);
    setStatus(null);
  };

  /** Mark this photo described and jump to the next one that is not. */
  const describeAndNext = () => {
    if (!active) return;
    if (!active.title.trim()) {
      setStatus({ tone: 'error', text: 'Give this painting a name before moving on.' });
      return;
    }
    const currentTempId = active.tempId;
    setDrafts((prev) =>
      prev.map((d) => (d.tempId === currentTempId ? { ...d, described: true } : d))
    );
    const nextIndex = drafts.findIndex((d) => d.tempId !== currentTempId && !d.described);
    if (nextIndex >= 0) {
      setActiveIndex(nextIndex);
      setStatus(null);
    } else {
      setStatus({ tone: 'ok', text: 'Every photo has details — publish when ready.' });
    }
  };

  const step = (delta: number) => {
    setActiveIndex((prev) => Math.max(0, Math.min(prev + delta, drafts.length - 1)));
  };

  /** Optimization may still be in flight; reuse it instead of doing the work twice. */
  const uploadDraft = async (draft: UploadDraft): Promise<string> => {
    // A framed export replaces the original entirely — the crop is the artwork.
    let precomputedDataUrl = draft.framedDataUrl ?? draft.precomputedDataUrl;
    let precomputedFilename = draft.framedFilename ?? draft.precomputedFilename;
    if (!precomputedDataUrl && draft.optimizedPromise) {
      try {
        const res = await draft.optimizedPromise;
        precomputedDataUrl = res.dataUrl;
        precomputedFilename = res.filename;
      } catch (e) {
        console.warn('Pre-compression unavailable, uploading the original:', e);
      }
    }
    return uploadFile(draft.file, {
      precomputedDataUrl,
      precomputedFilename,
      previewUrl: draft.previewUrl,
    });
  };

  const draftToArtItem = (draft: UploadDraft, src: string): ArtItem => {
    const def = galleryCatalogEntry(draft.targetGallery);
    return {
      id: `art-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      src,
      title: draft.title.trim() || 'Original Artwork',
      category: draft.category.trim() || def.defaultCategory,
      // Price and the availability badge belong to paintings that are actually
      // for sale. A showcase piece publishes neither. A sale piece published
      // with a price is price-confirmed the moment it goes live.
      price: draft.forSale && draft.price.trim() ? draft.price.trim() : undefined,
      priceConfirmedAt: draft.forSale && draft.price.trim() ? new Date().toISOString() : undefined,
      medium: draft.medium.trim() || undefined,
      dimensions: draft.dimensions.trim() || undefined,
      description: draft.description.trim() || undefined,
      status: draft.forSale ? draft.sellStatus : undefined,
      dateAdded: new Date().toISOString(),
    };
  };

  const validateForPublish = (list: UploadDraft[]): UploadDraft | null => {
    if (list.length === 0) return null;
    return list.find((d) => !d.title.trim()) ?? null;
  };

  /**
   * Upload a single photo and commit it immediately — the “one at a time”
   * path. The site content is built explicitly and handed to save() so the
   * publish never races React's state.
   */
  const publishOne = async () => {
    if (!active || busy !== 'idle') return;
    const unnamed = validateForPublish([active]);
    if (unnamed) {
      setStatus({ tone: 'error', text: 'Give this painting a name before publishing.' });
      return;
    }

    const draft = active;
    const def = galleryCatalogEntry(draft.targetGallery);
    setBusy('single');
    setStatus({ tone: 'info', text: `Uploading and publishing “${draft.title.trim()}”…` });

    try {
      const url = await uploadDraft(draft);
      const item = draftToArtItem(draft, url);
      await save(withNewArtworks(contentRef.current, [{ gallery: draft.targetGallery, item }]));
      removeDraft(draft.tempId);
      setStatus({
        tone: 'ok',
        text: draft.forSale
          ? `“${item.title}” is live in ${def.label}${item.price ? ` at ₹${item.price}` : ''}.`
          : `“${item.title}” is now on show in ${def.label} — no price attached.`,
      });
    } catch (err) {
      setStatus({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Could not publish this painting.',
      });
    } finally {
      setBusy('idle');
    }
  };

  const openBatchReview = () => {
    const list = drafts;
    if (list.length === 0) {
      setStatus({ tone: 'error', text: 'Add photos first — there is nothing to publish.' });
      return;
    }
    const unnamed = validateForPublish(list);
    if (unnamed) {
      setStatus({
        tone: 'error',
        text: `“${unnamed.file.name}” still needs a name before publishing.`,
      });
      setActiveIndex(drafts.findIndex((d) => d.tempId === unnamed.tempId));
      return;
    }
    setStatus(null);
    setCommitStatus('');
    setReviewOpen(true);
  };

  /** Publish the whole queue in one commit. */
  const publishSelected = async () => {
    const list = drafts;
    if (list.length === 0) {
      setReviewOpen(false);
      return;
    }
    setBusy('batch');
    setCommitStatus(`Preparing ${list.length} photo${list.length > 1 ? 's' : ''}…`);

    try {
      const entries: { gallery: GalleryKey; item: ArtItem }[] = [];
      for (let i = 0; i < list.length; i++) {
        const draft = list[i];
        setCommitStatus(
          `Uploading image ${i + 1} of ${list.length}: “${draft.title.trim() || draft.file.name}”…`
        );
        const url = await uploadDraft(draft);
        entries.push({ gallery: draft.targetGallery, item: draftToArtItem(draft, url) });
      }

      setCommitStatus('Publishing the website catalog to GitHub…');
      await save(withNewArtworks(contentRef.current, entries));

      const publishedIds = new Set(list.map((d) => d.tempId));
      draftsRef.current
        .filter((d) => publishedIds.has(d.tempId))
        .forEach((d) => {
          try {
            URL.revokeObjectURL(d.previewUrl);
          } catch {}
        });
      setDrafts((prev) => prev.filter((d) => !publishedIds.has(d.tempId)));
      setActiveIndex(0);
      setReviewOpen(false);
      setStatus({
        tone: 'ok',
        text: `${entries.length} painting${entries.length > 1 ? 's' : ''} published to the live site.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Publish failed';
      setCommitStatus(`Error: ${msg}`);
      setStatus({ tone: 'error', text: msg });
    } finally {
      setBusy('idle');
    }
  };

  /** What the admin sees is what publishes: the framed export when there is one. */
  const shownImage = (draft: UploadDraft) => draft.framedDataUrl ?? draft.previewUrl;

  const framingDraft = framingId ? drafts.find((d) => d.tempId === framingId) ?? null : null;

  const applyFraming = (tempId: string, result: FramedResult) => {
    setFramingId(null);
    // Nothing rotated, straightened or trimmed: keep the original file rather
    // than re-encoding an identical image.
    if (!framingChangesThePhoto(result.framing)) {
      patchDraft(tempId, { framing: undefined, framedDataUrl: undefined, framedFilename: undefined });
      setStatus({ tone: 'info', text: 'Nothing was changed — the original photo publishes as it is.' });
      return;
    }
    patchDraft(tempId, {
      framing: result.framing,
      framedDataUrl: result.dataUrl,
      framedFilename: result.filename,
    });
    setStatus({ tone: 'ok', text: 'Framing applied — that crop is what will publish.' });
  };

  const clearFraming = (tempId: string) => {
    patchDraft(tempId, { framing: undefined, framedDataUrl: undefined, framedFilename: undefined });
    setStatus({ tone: 'info', text: 'Framing cleared — publishing the original photo again.' });
  };

  const reviewDrafts: ReviewDraftPreview[] = drafts.map((d) => ({
    id: d.tempId,
    previewUrl: shownImage(d),
    title: d.title.trim() || 'Untitled',
    galleryLabel: galleryCatalogEntry(d.targetGallery).label,
    price: d.forSale ? d.price.trim() : '',
    medium: d.medium.trim(),
    forSale: d.forSale,
  }));

  const statusTone =
    status?.tone === 'ok'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
      : status?.tone === 'error'
        ? 'border-red-500/40 bg-red-500/10 text-red-200'
        : 'border-studio-gold/30 bg-purple-950/40 text-yellow-100/80';

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          // Allow re-picking the same file after a mistake.
          e.target.value = '';
        }}
      />

      {/* ---------------- Step 1 — pick the photos ---------------- */}
      {drafts.length === 0 ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            addFiles(e.dataTransfer.files);
          }}
          onClick={openPicker}
          className={`relative cursor-pointer rounded-3xl border-2 border-dashed p-8 text-center shadow-xl transition-all md:p-12 ${
            dragOver
              ? 'border-yellow-300 bg-purple-950/80 shadow-[0_0_25px_rgba(242,215,112,0.3)]'
              : 'border-studio-gold/40 bg-[#190626]/80 hover:border-studio-gold hover:bg-[#200830]'
          }`}
        >
          <div className="mx-auto max-w-xl space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-studio-gold/60 bg-studio-purple/80 text-studio-gold shadow-xl">
              <Upload className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-blippo text-2xl text-[#ffe76c] md:text-3xl">
                Upload photos of your art
              </h3>
              <p className="mt-2 text-xs text-yellow-100/70 md:text-sm">
                Opens your gallery — select one photo or many. You then describe them one at a
                time, with the painting in front of you, and publish one or a whole batch.
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openPicker();
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 px-7 py-3 text-base font-extrabold text-black shadow-lg transition-all hover:from-amber-400 hover:to-yellow-400 active:scale-95"
            >
              <ImagePlus className="h-5 w-5" />
              Choose photos
            </button>
            <p className="text-[11px] text-yellow-100/50">
              …or drag &amp; drop them here · JPEG, PNG, WebP, AVIF, HEIC · compressed automatically
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl border border-studio-gold/30 bg-[#190626]/90 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-studio-gold/40 bg-purple-950/70 text-studio-gold">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="font-blippo text-lg text-[#fdf5cf]">
                {drafts.length} photo{drafts.length > 1 ? 's' : ''} in the queue
              </p>
              <p className="text-[11px] text-yellow-100/60">
                {stillToDescribe === 0
                  ? 'All described — publish whenever you are ready.'
                  : `${stillToDescribe} still need details · photo ${activeIndex + 1} of ${drafts.length}`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openPicker}
              className="inline-flex items-center gap-1.5 rounded-xl border border-studio-gold/50 bg-purple-950/70 px-3.5 py-2 text-xs font-bold text-studio-gold transition-colors hover:bg-purple-900"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              Add photos
            </button>
            <button
              type="button"
              onClick={discardAll}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-900/60 bg-red-950/40 px-3.5 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-900/60"
            >
              <X className="h-3.5 w-3.5" />
              Discard all
            </button>
          </div>
        </div>
      )}

      {status && (
        <p className={`rounded-xl border px-4 py-3 text-sm ${statusTone}`}>{status.text}</p>
      )}

      {/* ---------------- Step 2 — describe one photo at a time ---------------- */}
      {active && activeDef && (
        <>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-purple-950/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all"
              style={{
                width: `${Math.round(
                  ((drafts.length - stillToDescribe) / Math.max(1, drafts.length)) * 100
                )}%`,
              }}
            />
          </div>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
            {/* The painting, big enough to judge while describing it. */}
            <div className="overflow-hidden rounded-3xl border border-studio-gold/25 bg-[#120219] shadow-2xl">
              <div className="flex items-center justify-between gap-2 border-b border-purple-900/60 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => step(-1)}
                  disabled={activeIndex === 0}
                  className="inline-flex items-center gap-1 rounded-lg border border-purple-800/70 bg-purple-950/70 px-2.5 py-1.5 text-xs font-semibold text-yellow-100/80 transition-colors hover:bg-purple-900 disabled:opacity-30"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>
                <span className="text-xs font-bold uppercase tracking-wider text-yellow-200/80">
                  Photo {activeIndex + 1} of {drafts.length}
                </span>
                <button
                  type="button"
                  onClick={() => step(1)}
                  disabled={activeIndex === drafts.length - 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-purple-800/70 bg-purple-950/70 px-2.5 py-1.5 text-xs font-semibold text-yellow-100/80 transition-colors hover:bg-purple-900 disabled:opacity-30"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              {shownImage(active) ? (
                // Local blob preview, or the framed export — next/image handles
                // neither an object URL nor a data URL here.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={shownImage(active)}
                  alt={active.title || 'Artwork waiting for details'}
                  className="max-h-[420px] w-full bg-black/60 object-contain sm:max-h-[520px]"
                />
              ) : (
                <div className="flex h-64 items-center justify-center text-yellow-100/50">
                  Preview unavailable — the photo will still upload.
                </div>
              )}
              <div className="space-y-2 border-t border-purple-900/60 px-3 py-2.5 text-[11px] text-yellow-100/60">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{active.file.name}</span>
                  <span className="shrink-0">
                    {active.described ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                        <Check className="h-3.5 w-3.5" /> Details saved
                      </span>
                    ) : (
                      'Waiting for details'
                    )}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFramingId(active.tempId)}
                    disabled={busy !== 'idle'}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-studio-gold/50 bg-purple-950/70 px-3 py-1.5 text-[11px] font-bold text-studio-gold transition-colors hover:bg-purple-900 disabled:opacity-50"
                  >
                    <Crop className="h-3.5 w-3.5" />
                    {active.framedDataUrl ? 'Adjust framing' : 'Crop, rotate & straighten'}
                  </button>
                  {active.framedDataUrl && (
                    <>
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-600/50 bg-emerald-950/50 px-2 py-1 text-[10px] font-bold text-emerald-300">
                        <Check className="h-3 w-3" /> framed
                      </span>
                      <button
                        type="button"
                        onClick={() => clearFraming(active.tempId)}
                        disabled={busy !== 'idle'}
                        className="text-[11px] font-semibold text-yellow-200/70 underline transition-colors hover:text-white disabled:opacity-50"
                      >
                        Use the original
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* One form, for one painting. */}
            <div className="space-y-4 rounded-3xl border border-studio-gold/25 bg-[#190626]/90 p-5 shadow-2xl">
              <div>
                <label className="site-label" htmlFor="up-title">
                  Painting name *
                </label>
                <input
                  id="up-title"
                  className="site-input"
                  value={active.title}
                  maxLength={80}
                  placeholder="e.g. Monsoon Raga — Varanasi Ghats"
                  onChange={(e) => patchDraft(active.tempId, { title: e.target.value, described: false })}
                />
              </div>

              {/*
                The question the admin actually has in mind. “Where should this
                appear?” hid a commercial decision inside a gallery dropdown,
                which is how non-sale artworks ended up being asked for a price.
              */}
              <div>
                <span className="site-label">Is this painting for sale?</span>
                <div
                  role="group"
                  aria-label="Is this painting for sale?"
                  className="mt-1.5 grid grid-cols-2 gap-2"
                >
                  <button
                    type="button"
                    aria-pressed={!active.forSale}
                    disabled={busy !== 'idle'}
                    onClick={() => setSaleIntent(active, false)}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors disabled:opacity-50 ${
                      !active.forSale
                        ? 'border-studio-gold bg-studio-gold/15 text-[#ffe76c]'
                        : 'border-purple-900/80 bg-[#140320] text-yellow-100/60 hover:border-studio-gold/40'
                    }`}
                  >
                    <ImagePlus className="h-4 w-4" /> Just show it
                  </button>
                  <button
                    type="button"
                    aria-pressed={active.forSale}
                    disabled={busy !== 'idle'}
                    onClick={() => setSaleIntent(active, true)}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors disabled:opacity-50 ${
                      active.forSale
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                        : 'border-purple-900/80 bg-[#140320] text-yellow-100/60 hover:border-emerald-500/40'
                    }`}
                  >
                    <Tag className="h-4 w-4" /> Sell it
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-yellow-200/60">
                  {active.forSale
                    ? `Buyers can buy it on the ${galleryCatalogEntry(SALE_GALLERY).label} page — so this one asks for a price.`
                    : 'Goes to a gallery below as a showcase piece. No price is asked for it.'}
                </p>
              </div>

              {active.forSale ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/90">
                    Appears on
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-yellow-100">{activeDef.label}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-yellow-200/70">
                    {activeDef.purpose}
                  </p>
                </div>
              ) : (
                <div>
                  <label className="site-label" htmlFor="up-gallery">
                    Which gallery should it appear in?
                  </label>
                  <select
                    id="up-gallery"
                    className="site-input cursor-pointer"
                    value={active.targetGallery}
                    onChange={(e) => {
                      const nextGallery = e.target.value as GalleryKey;
                      const def = galleryCatalogEntry(nextGallery);
                      patchDraft(active.tempId, {
                        targetGallery: nextGallery,
                        showcaseGallery: nextGallery,
                        gallerySource: 'manual',
                        category: active.categoryTouched ? active.category : def.defaultCategory,
                        described: false,
                      });
                    }}
                  >
                    {SHOWCASE_GALLERIES.map((def) => (
                      <option key={def.key} value={def.key} className="bg-[#190626]">
                        {def.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] leading-snug text-yellow-200/60">
                    {active.gallerySource === 'filename' && (
                      <span className="font-bold text-emerald-400">
                        ✓ auto-matched from the filename —{' '}
                      </span>
                    )}
                    {activeDef.purpose}
                  </p>
                </div>
              )}

              <div>
                <label className="site-label" htmlFor="up-category">
                  Section label (optional)
                </label>
                <div className="relative">
                  <Tag className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-studio-gold/60" />
                  <input
                    id="up-category"
                    className="site-input"
                    maxLength={60}
                    placeholder={activeDef.defaultCategory}
                    value={active.category}
                    onChange={(e) =>
                      patchDraft(active.tempId, {
                        category: e.target.value,
                        categoryTouched: true,
                        described: false,
                      })
                    }
                  />
                </div>
              </div>

              {/* Price and availability only exist for work that is for sale. */}
              {active.forSale && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="site-label" htmlFor="up-price">
                      Price (₹)
                    </label>
                    <input
                      id="up-price"
                      className="site-input"
                      inputMode="numeric"
                      placeholder="on request"
                      value={active.price}
                      onChange={(e) => patchDraft(active.tempId, { price: e.target.value, described: false })}
                    />
                  </div>
                  <div>
                    <label className="site-label" htmlFor="up-status">
                      Availability
                    </label>
                    <select
                      id="up-status"
                      className="site-input cursor-pointer"
                      value={active.sellStatus}
                      onChange={(e) =>
                        patchDraft(active.tempId, {
                          sellStatus: e.target.value as SellStatus,
                          described: false,
                        })
                      }
                    >
                      <option value="Available" className="bg-[#190626]">
                        Available
                      </option>
                      <option value="Reserved" className="bg-[#190626]">
                        Reserved
                      </option>
                      <option value="Sold" className="bg-[#190626]">
                        Sold
                      </option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="site-label" htmlFor="up-medium">
                    Medium (optional)
                  </label>
                  <input
                    id="up-medium"
                    className="site-input"
                    maxLength={60}
                    placeholder="e.g. Watercolour on paper"
                    value={active.medium}
                    onChange={(e) => patchDraft(active.tempId, { medium: e.target.value, described: false })}
                  />
                </div>
                <div>
                  <label className="site-label" htmlFor="up-dimensions">
                    Size (optional)
                  </label>
                  <input
                    id="up-dimensions"
                    className="site-input"
                    maxLength={40}
                    placeholder="e.g. 12 × 16 in"
                    value={active.dimensions}
                    onChange={(e) =>
                      patchDraft(active.tempId, { dimensions: e.target.value, described: false })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="site-label" htmlFor="up-description">
                  Description (optional)
                </label>
                <textarea
                  id="up-description"
                  className="site-input min-h-[84px] resize-y"
                  maxLength={400}
                  placeholder="Story behind the piece, year, inspiration…"
                  value={active.description}
                  onChange={(e) =>
                    patchDraft(active.tempId, { description: e.target.value, described: false })
                  }
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={describeAndNext}
                  disabled={busy !== 'idle'}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-600/25 px-4 py-2.5 text-sm font-bold text-emerald-200 transition-colors hover:bg-emerald-600/40 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  Save details &amp; next photo
                </button>
                <button
                  type="button"
                  onClick={() => removeDraft(active.tempId)}
                  disabled={busy !== 'idle'}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-300/80 transition-colors hover:bg-red-950/50 hover:text-red-300 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove photo
                </button>
              </div>
            </div>
          </div>

          {/* Filmstrip — jump to any photo in the queue. */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-yellow-200/60">
                Queue — tap a photo to describe or review it
              </p>
              <p className="text-[11px] text-yellow-100/50">
                Every photo here publishes together — remove the ones you don&apos;t want
              </p>
            </div>
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
              {drafts.map((draft, i) => {
                const isActive = i === activeIndex;
                const def = galleryCatalogEntry(draft.targetGallery);
                return (
                  <div
                    key={draft.tempId}
                    className={`relative w-[104px] shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                      isActive
                        ? 'border-studio-gold shadow-[0_0_14px_rgba(242,215,112,0.35)]'
                        : draft.described
                          ? 'border-emerald-600/60'
                          : 'border-purple-900/70 hover:border-studio-gold/50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveIndex(i)}
                      className="block w-full text-left"
                      title={`${draft.title || draft.file.name} → ${def.label}`}
                    >
                      {shownImage(draft) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={shownImage(draft)}
                          alt=""
                          className="h-[74px] w-full bg-black/50 object-cover"
                        />
                      ) : (
                        <span className="flex h-[74px] items-center justify-center bg-black/40 text-yellow-100/40">
                          <ImagePlus className="h-5 w-5" />
                        </span>
                      )}
                      <span className="block truncate px-1.5 py-1 text-[10px] font-semibold text-yellow-100/80">
                        {i + 1}. {draft.title.trim() || 'Untitled'}
                      </span>
                    </button>
                    {draft.described && (
                      <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    {draft.framedDataUrl && (
                      <span
                        title="Framed"
                        className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-studio-gold text-black"
                      >
                        <Crop className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Publish bar — one painting at a time, or the whole queue. */}
          <div className="flex flex-col gap-3 rounded-2xl border border-studio-gold/40 bg-[#160523]/95 p-4 shadow-2xl sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-blippo text-lg text-[#ffe76c]">Publish</p>
              <p className="text-[11px] text-yellow-100/60">
                {drafts.length} photo{drafts.length === 1 ? '' : 's'} in the queue
                {' · '}
                <span className="text-emerald-300">{forSaleCount} for sale</span>
                {' · '}
                <span className="text-yellow-200/70">
                  {drafts.length - forSaleCount} showcase
                </span>
                {' · '}
                {stillToDescribe === 0 ? 'all described' : `${stillToDescribe} need details`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void publishOne()}
                disabled={busy !== 'idle'}
                title={`Upload and commit just “${active.title.trim() || active.file.name}” to ${activeDef.label}`}
                className="inline-flex items-center gap-2 rounded-xl border border-studio-gold/60 bg-purple-950/70 px-4 py-2.5 text-sm font-bold text-studio-gold transition-colors hover:bg-purple-900 disabled:opacity-50"
              >
                {busy === 'single' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CloudUpload className="h-4 w-4" />
                )}
                Publish this photo to {activeDef.label}
              </button>
              {drafts.length > 1 && (
                <button
                  type="button"
                  onClick={openBatchReview}
                  disabled={busy !== 'idle'}
                  title={`Upload and commit all ${drafts.length} queued photos in one go`}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 px-5 py-2.5 text-sm font-extrabold text-black shadow-lg transition-all hover:from-amber-400 hover:to-yellow-400 disabled:opacity-50"
                >
                  {busy === 'batch' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCheck className="h-4 w-4" />
                  )}
                  Publish all {drafts.length} photos
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {editor.status && (
        <p className="text-[11px] text-yellow-100/50">{editor.status}</p>
      )}

      {framingDraft && (
        <ArtworkFramer
          file={framingDraft.file}
          title={framingDraft.title}
          initial={framingDraft.framing}
          onCancel={() => setFramingId(null)}
          onApply={(result) => applyFraming(framingDraft.tempId, result)}
        />
      )}

      <ReviewChangesModal
        isOpen={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onConfirm={publishSelected}
        changes={getPendingChanges()}
        isCommitting={busy === 'batch' || editor.saving}
        commitStatus={commitStatus}
        commitUrl={editor.commitUrl}
        title="Review the new paintings"
        subtitle="These paintings will be committed to GitHub and appear first in their collections."
        confirmLabel={`Confirm & publish ${drafts.length} painting${drafts.length === 1 ? '' : 's'}`}
        drafts={reviewDrafts}
      />
    </div>
  );
}
