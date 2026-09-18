'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { CheckCircle2, ImagePlus, Send, UploadCloud, Loader2, Tag } from 'lucide-react';
import { useSite } from '@/context/SiteContext';
import { studioMeta } from '@/data/artData';

/**
 * Dual-mode artwork entry form (lives on the home page, #list-artwork).
 *
 * • Signed-in admin → uploads the image, appends it to the Sale gallery with
 *   name/price/medium/description, and publishes straight to GitHub.
 * • Public visitor  → composes a rich WhatsApp inquiry (name, price, details)
 *   to the studio; the photo is attached inside the WhatsApp chat.
 */
export default function ArtworkEntryForm() {
  const { uploadFile, appendArtwork, save } = useSite();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [medium, setMedium] = useState('');
  const [category, setCategory] = useState('Paintings for Sale');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setIsAdmin(Boolean(d?.ok)))
      .catch(() => setIsAdmin(false))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onPickFile = (f: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (f && f.type.startsWith('image/')) {
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setFile(null);
      setPreviewUrl('');
    }
  };

  const inquiryText = useMemo(() => {
    const lines = [
      'Hello Anugruja Arts Studio! I would like to list/ask about an artwork:',
      title ? `• Name: ${title}` : null,
      price ? `• Expected price: ₹${price}` : null,
      medium ? `• Medium: ${medium}` : null,
      category ? `• Category: ${category}` : null,
      description ? `• Details: ${description}` : null,
      file ? '• (I will attach the artwork photo in this chat.)' : null,
    ].filter(Boolean);
    return lines.join('\n');
  }, [title, price, medium, category, description, file]);

  const reset = () => {
    setTitle('');
    setPrice('');
    setMedium('');
    setCategory('Paintings for Sale');
    setDescription('');
    onPickFile(null);
  };

  const submitPublic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFeedback({ ok: false, msg: 'Please give the artwork a name.' });
      return;
    }
    const waUrl = `https://wa.me/919849238464?text=${encodeURIComponent(inquiryText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    setFeedback({
      ok: true,
      msg: 'WhatsApp opened with your artwork details — just attach the photo and send!',
    });
  };

  const submitAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFeedback({ ok: false, msg: 'Please give the artwork a name.' });
      return;
    }
    if (!file) {
      setFeedback({ ok: false, msg: 'Choose an artwork image to upload.' });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const url = await uploadFile(file, { previewUrl });
      appendArtwork('sale', {
        id: `p-${Date.now()}`,
        src: url,
        title: title.trim(),
        category: category.trim() || 'Paintings for Sale',
        price: price.trim() || undefined,
        medium: medium.trim() || undefined,
        description: description.trim() || undefined,
        dateAdded: new Date().toISOString().slice(0, 10),
      });
      const commitUrl = await save();
      setFeedback({
        ok: true,
        msg: commitUrl
          ? 'Artwork published to the live site (committed to GitHub)! 🎉'
          : 'Artwork saved to the site catalog.',
      });
      reset();
    } catch (err) {
      setFeedback({
        ok: false,
        msg: err instanceof Error ? err.message : 'Could not publish artwork.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={isAdmin ? submitAdmin : submitPublic}
      className="glass-panel rounded-3xl p-5 sm:p-8 shadow-2xl space-y-5 text-left"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-decorative text-xl sm:text-2xl text-studio-gold font-bold">
            {isAdmin ? 'Add a Painting for Sale' : 'List or Ask About an Artwork'}
          </h3>
          <p className="text-xs sm:text-sm text-amber-100/70 mt-1">
            {isAdmin
              ? 'Admin mode: uploads straight into the Sale gallery and publishes live.'
              : 'Enter the name, price and details — we receive it on WhatsApp instantly.'}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-pill text-[11px] text-amber-200">
          <Tag className="w-3.5 h-3.5 text-studio-sunset" />
          {isAdmin ? 'Admin' : 'Quick inquiry'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="site-label" htmlFor="aw-title">
            Artwork name *
          </label>
          <input
            id="aw-title"
            className="site-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Monsoon Raga — Varanasi Ghats"
            maxLength={80}
          />
        </div>

        <div>
          <label className="site-label" htmlFor="aw-price">
            Price (₹)
          </label>
          <input
            id="aw-price"
            className="site-input"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="e.g. 12500"
            inputMode="numeric"
          />
        </div>

        <div>
          <label className="site-label" htmlFor="aw-medium">
            Medium
          </label>
          <input
            id="aw-medium"
            className="site-input"
            value={medium}
            onChange={(e) => setMedium(e.target.value)}
            placeholder="e.g. Watercolour on paper"
            maxLength={60}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="site-label" htmlFor="aw-category">
            Category
          </label>
          <input
            id="aw-category"
            className="site-input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Paintings for Sale"
            maxLength={60}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="site-label" htmlFor="aw-desc">
            Description
          </label>
          <textarea
            id="aw-desc"
            className="site-input min-h-[84px] resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Size, year, story behind the piece…"
            maxLength={400}
          />
        </div>

        <div className="sm:col-span-2">
          <span className="site-label">Artwork photo {isAdmin ? '*' : '(attach in WhatsApp)'}</span>
          <label
            htmlFor="aw-file"
            className="group flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-studio-gold/35 hover:border-studio-gold/70 bg-studio-deep/50 cursor-pointer transition-all"
          >
            {previewUrl ? (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-studio-gold/50 shrink-0">
                {/* preview only — plain img because the file is local-only */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Selected artwork preview" className="w-full h-full object-cover" />
              </div>
            ) : (
              <span className="w-20 h-20 rounded-xl bg-purple-950/60 border border-studio-gold/25 flex items-center justify-center shrink-0">
                <ImagePlus className="w-8 h-8 text-studio-gold/70 group-hover:scale-110 transition-transform" />
              </span>
            )}
            <span className="text-sm text-amber-100/80 font-blippo">
              {previewUrl ? file?.name : 'Tap to choose an image (JPG / PNG)'}
              <span className="block text-xs text-amber-100/50 mt-0.5">
                Compressed automatically before upload
              </span>
            </span>
            <input
              id="aw-file"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>
      </div>

      {feedback && (
        <p
          className={`flex items-start gap-2 text-sm rounded-xl px-4 py-3 border ${
            feedback.ok
              ? 'bg-emerald-500/10 border-emerald-400/40 text-emerald-200'
              : 'bg-red-500/10 border-red-400/40 text-red-200'
          }`}
        >
          {feedback.ok ? (
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          ) : (
            <Send className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          <span>{feedback.msg}</span>
        </p>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button
          type="submit"
          disabled={submitting || checking}
          className={`inline-flex items-center justify-center gap-2 min-h-[50px] px-8 py-3 rounded-2xl font-bold text-base sm:text-lg active:scale-95 transition-all shadow-xl ${
            isAdmin
              ? 'glass-btn-sunset text-white'
              : 'bg-emerald-600/85 hover:bg-emerald-600 border border-emerald-300/40 text-white'
          } disabled:opacity-60`}
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Publishing…</span>
            </>
          ) : isAdmin ? (
            <>
              <UploadCloud className="w-5 h-5" />
              <span>Publish to Sale Gallery</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Send via WhatsApp</span>
            </>
          )}
        </button>

        {!isAdmin && (
          <a
            href={`mailto:${studioMeta.email}?subject=${encodeURIComponent(
              'Artwork listing inquiry'
            )}&body=${encodeURIComponent(inquiryText)}`}
            className="inline-flex items-center justify-center gap-2 min-h-[50px] px-6 py-3 rounded-2xl glass-btn-gold text-studio-gold font-bold text-sm active:scale-95"
          >
            or Email instead
          </a>
        )}
      </div>

      {!isAdmin && !checking && (
        <p className="text-[11px] text-amber-100/40 leading-relaxed">
          Studio team? <a href="/login" className="underline hover:text-studio-gold">Sign in</a> to
          publish artworks directly to the live gallery.
        </p>
      )}
    </form>
  );
}
