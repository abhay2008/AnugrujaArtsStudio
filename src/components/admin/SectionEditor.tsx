'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowUp, Trash2, LayoutGrid } from 'lucide-react';
import { useSite } from '@/context/SiteContext';
import {
  GALLERY_DEFINITIONS,
  type ArtItem,
  type GalleryKey,
  type PageListing,
} from '@/lib/types';
import { findPreviewSection } from '@/lib/previewSections';

const inputClass =
  'w-full rounded-xl border border-studio-gold/30 bg-[#260a3a] px-3 py-2 text-sm text-yellow-100 placeholder:text-yellow-200/30 focus:border-yellow-300 focus:outline-none';

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-yellow-200/60">
        {label}
      </span>
      <input
        type="text"
        className={inputClass}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Area({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-yellow-200/60">
        {label}
      </span>
      <textarea
        rows={rows}
        className={`${inputClass} resize-y leading-relaxed`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ImageField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-yellow-200/60">
        {label}
      </span>
      <div className="flex items-center gap-3">
        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-studio-gold/30 bg-black/40">
          {value ? (
            <Image src={value} alt="" fill sizes="56px" className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[10px] text-yellow-200/40">
              none
            </span>
          )}
        </span>
        <input
          type="text"
          className={inputClass}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="/images/…"
        />
      </div>
      {hint ? <p className="mt-1 text-[11px] text-yellow-200/45">{hint}</p> : null}
    </div>
  );
}

function GalleryRows({ gallery }: { gallery: GalleryKey }) {
  const { content, updateArtwork } = useSite();
  const items: ArtItem[] = content.galleries[gallery] ?? [];
  const definition = GALLERY_DEFINITIONS.find((entry) => entry.key === gallery);

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-yellow-200/50">
        {items.length} {items.length === 1 ? 'artwork' : 'artworks'} in {definition?.label ?? gallery}. Edit
        titles and prices here; use the gallery manager for uploads, ordering and descriptions.
      </p>
      <div className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
        {items.slice(0, 40).map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-purple-900/60 bg-[#190626]/80 p-2.5 space-y-2"
          >
            <div className="flex items-center gap-2.5">
              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-studio-gold/25 bg-black/40">
                <Image src={item.src} alt="" fill sizes="40px" className="object-cover" />
              </span>
              <input
                type="text"
                className={inputClass}
                value={item.title}
                onChange={(event) => updateArtwork(gallery, item.id, { title: event.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                className={inputClass}
                placeholder="Price"
                value={item.price === undefined || item.price === null ? '' : String(item.price)}
                onChange={(event) =>
                  updateArtwork(gallery, item.id, {
                    price: event.target.value === '' ? undefined : Number(event.target.value) || event.target.value,
                  })
                }
              />
              <select
                className={inputClass}
                value={item.status ?? 'Available'}
                onChange={(event) =>
                  updateArtwork(gallery, item.id, { status: event.target.value as ArtItem['status'] })
                }
              >
                <option value="Available">Available</option>
                <option value="Reserved">Reserved</option>
                <option value="Sold">Sold</option>
              </select>
            </div>
          </div>
        ))}
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-studio-gold/30 p-4 text-center text-xs text-yellow-200/50">
            This gallery is empty.
          </p>
        ) : null}
      </div>
      <Link
        href="/admin/studio"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-studio-gold hover:text-yellow-200"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Open the gallery manager
      </Link>
    </div>
  );
}

function LayoutRows() {
  const { content, updateSection } = useSite();
  const items: PageListing[] = content.sections?.pageMeta?.quickNav ?? [];

  const persist = (next: PageListing[]) => updateSection('pageMeta', { quickNav: next });

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row);
    persist(next);
  };

  const patch = (id: string, changes: Partial<PageListing>) =>
    persist(items.map((item) => (item.id === id ? { ...item, ...changes } : item)));

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-yellow-200/50">
        {items.length} shortcuts. Reorder, rename or drop a chip; the preview below updates instantly.
      </p>
      <div className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
        {items.map((item, index) => (
          <div key={item.id} className="space-y-2 rounded-xl border border-purple-900/60 bg-[#190626]/80 p-2.5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                className={inputClass}
                value={item.label}
                onChange={(event) => patch(item.id, { label: event.target.value })}
              />
              <button
                type="button"
                onClick={() => move(index, -1)}
                className="rounded-lg border border-purple-800/60 bg-purple-950/70 p-1.5 text-yellow-200/80 hover:text-white"
                aria-label="Move up"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                className="rounded-lg border border-purple-800/60 bg-purple-950/70 p-1.5 text-yellow-200/80 hover:text-white"
                aria-label="Move down"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Remove the "${item.title || 'Untitled'}" shortcut? This is staged as an unsaved change and can still be discarded before commit.`)) {
                    persist(items.filter((entry) => entry.id !== item.id));
                  }
                }}
                className="rounded-lg border border-red-900/60 bg-red-950/50 p-1.5 text-red-300 hover:bg-red-900/60"
                aria-label="Remove shortcut"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                className={inputClass}
                value={item.href}
                placeholder="#section or /path"
                onChange={(event) => patch(item.id, { href: event.target.value })}
              />
              <input
                type="text"
                className={inputClass}
                value={item.title}
                placeholder="Tooltip title"
                onChange={(event) => patch(item.id, { title: event.target.value })}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Field group for the section currently selected in the preview. */
export default function SectionEditor({ sectionId }: { sectionId: string }) {
  const { content, updateBrand, updateSection } = useSite();
  const meta = findPreviewSection(sectionId);
  const banner = content.sections?.banner;
  const aboutArtist = content.sections?.aboutArtist;
  const courses = content.sections?.courses;

  if (!meta) return null;

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-yellow-200/50">{meta.hint}</p>

      {meta.id === 'banner' && (
        <div className="space-y-3">
          <Field
            label="Headline"
            value={banner?.title ?? ''}
            onChange={(value) => updateSection('banner', { title: value })}
          />
          <Area
            label="Sub-headline"
            rows={2}
            value={banner?.subtitle ?? ''}
            onChange={(value) => updateSection('banner', { subtitle: value })}
          />
          <Area
            label="Opening quote"
            rows={2}
            value={banner?.quote ?? ''}
            onChange={(value) => updateSection('banner', { quote: value })}
          />
          <Field
            label="Badge pill"
            value={banner?.badge ?? ''}
            onChange={(value) => updateSection('banner', { badge: value })}
          />
          <ImageField
            label="Emblem"
            value={banner?.logo ?? ''}
            onChange={(value) => updateSection('banner', { logo: value })}
            hint="Shown above the headline and in the preview header."
          />
          <ImageField
            label="Banner backdrop"
            value={banner?.bgImage ?? ''}
            onChange={(value) => updateSection('banner', { bgImage: value })}
          />
        </div>
      )}

      {meta.id === 'aboutArtist' && (
        <div className="space-y-3">
          <Field
            label="Headline"
            value={aboutArtist?.headline ?? ''}
            onChange={(value) => updateSection('aboutArtist', { headline: value })}
          />
          <Area
            label="Biography lead"
            rows={3}
            value={aboutArtist?.subheading ?? ''}
            onChange={(value) => updateSection('aboutArtist', { subheading: value })}
          />
          <ImageField
            label="Portrait"
            value={aboutArtist?.portraitImage ?? ''}
            onChange={(value) => updateSection('aboutArtist', { portraitImage: value })}
          />
          <Field
            label="Portrait alt text"
            value={aboutArtist?.portraitAlt ?? ''}
            onChange={(value) => updateSection('aboutArtist', { portraitAlt: value })}
          />
        </div>
      )}

      {meta.id === 'courses' && (
        <div className="space-y-3">
          <Field
            label="Title"
            value={courses?.title ?? ''}
            onChange={(value) => updateSection('courses', { title: value })}
          />
          <Area
            label="Lead copy"
            rows={3}
            value={courses?.subtitle ?? ''}
            onChange={(value) => updateSection('courses', { subtitle: value })}
          />
        </div>
      )}

      {meta.kind === 'gallery' && meta.gallery && <GalleryRows gallery={meta.gallery} />}
      {meta.id === 'quicknav' && <LayoutRows />}

      {meta.id === 'brand' && (
        <div className="space-y-3">
          <Field
            label="Studio name"
            value={content.brand.name}
            onChange={(value) => updateBrand({ name: value })}
          />
          <Field
            label="Master artist / founder"
            value={content.brand.founder}
            onChange={(value) => updateBrand({ founder: value })}
          />
          <Field
            label="Tagline"
            value={content.brand.tagline}
            onChange={(value) => updateBrand({ tagline: value })}
          />
          <Field
            label="Sub-headline"
            value={content.brand.subtitle}
            onChange={(value) => updateBrand({ subtitle: value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Field
              label="Phone (display)"
              value={content.brand.phoneDisplay}
              onChange={(value) => updateBrand({ phoneDisplay: value })}
            />
            <Field
              label="Phone (digits)"
              value={content.brand.phoneRaw}
              onChange={(value) => updateBrand({ phoneRaw: value })}
            />
          </div>
          <Field
            label="Email"
            value={content.brand.email}
            onChange={(value) => updateBrand({ email: value })}
          />
          <Field
            label="WhatsApp link"
            value={content.brand.whatsapp}
            onChange={(value) => updateBrand({ whatsapp: value })}
          />
          <Field
            label="Location label"
            value={content.brand.locationLabel}
            onChange={(value) => updateBrand({ locationLabel: value })}
          />
        </div>
      )}
    </div>
  );
}
