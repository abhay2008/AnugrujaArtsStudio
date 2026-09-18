'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CloudUpload, Loader2, RotateCcw, X, MousePointerClick } from 'lucide-react';
import { useSite } from '@/context/SiteContext';
import { PREVIEW_SECTIONS } from '@/lib/previewSections';
import SectionEditor from './SectionEditor';
import { CommitReviewModal, useCommitFlow } from './AdminShell';
import { useConfirm } from './ConfirmDialog';

const inputClass =
  'w-full rounded-xl border border-studio-gold/30 bg-[#260a3a] px-3 py-2 text-sm text-yellow-100 placeholder:text-yellow-200/30 focus:border-yellow-300 focus:outline-none';

function SiteWideFields() {
  // The discard confirmation uses the console's own dialog, not window.confirm.
  const { confirm, dialog: confirmDialog } = useConfirm();
  const { content, updateMeta, updateBrand, reset } = useSite();

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-yellow-200/50">
        Applies across every page — search engines, the header and the footer.
      </p>
      <label className="block">
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-yellow-200/60">
          Meta title
        </span>
        <input
          type="text"
          className={inputClass}
          value={content.meta.title}
          onChange={(event) => updateMeta({ title: event.target.value })}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-yellow-200/60">
          Meta description
        </span>
        <textarea
          rows={4}
          className={`${inputClass} resize-y leading-relaxed`}
          value={content.meta.description}
          onChange={(event) => updateMeta({ description: event.target.value })}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-yellow-200/60">
          Favicon path
        </span>
        <input
          type="text"
          className={inputClass}
          value={content.meta.favicon}
          onChange={(event) => updateMeta({ favicon: event.target.value })}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-yellow-200/60">
          Footer tagline
        </span>
        <input
          type="text"
          className={inputClass}
          value={content.brand.tagline}
          onChange={(event) => updateBrand({ tagline: event.target.value })}
        />
      </label>

      <div className="rounded-xl border border-purple-900/60 bg-[#190626]/80 p-3 text-[11px] text-yellow-200/60">
        {content.social.length} social links are wired into the header and contact bar. Edit them from the
        Brand &amp; SEO tab of the no-preview workspace.
      </div>

      <button
        type="button"
        onClick={async () => {
          const ok = await confirm({
            title: 'Discard local edits',
            message: 'Discard local edits and reload the last published content?',
            confirmLabel: 'Discard edits',
            tone: 'default',
          });
          if (ok) reset();
        }}
        className="inline-flex items-center gap-1.5 rounded-xl border border-purple-800/60 bg-purple-950/60 px-3 py-2 text-xs font-semibold text-yellow-100/80 transition-colors hover:border-studio-gold/40 hover:text-white"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset to original content
      </button>

      {confirmDialog}
    </div>
  );
}

/**
 * Right-hand editor for the "with preview" workspace.
 *
 * Mirrors Jeeva Art School's AdminChrome: a Section / Site-wide tab pair, the
 * selected block's fields, and one Save & Commit action that routes through the
 * existing review-then-push-to-GitHub flow.
 */
export default function PreviewEditorPane() {
  const { editor, selectSection, signOut } = useSite();
  const [tab, setTab] = useState<'section' | 'site'>('section');
  const flow = useCommitFlow();
  const selected = editor.selectedId;

  // Opening the workspace with nothing selected leaves the panel empty; start on
  // the hero so the first click is never a dead end.
  useEffect(() => {
    if (!selected) selectSection('banner');
  }, [selected, selectSection]);

  return (
    <aside className="flex h-[55vh] min-h-0 w-full shrink-0 flex-col border-t border-studio-gold/25 bg-[#160523]/95 md:h-full md:w-[24rem] md:border-l md:border-t-0 lg:w-[27rem]">
      <div className="flex items-start justify-between gap-3 border-b border-studio-gold/20 p-4">
        <div>
          <h2 className="font-blippo text-xl text-[#ffe76c]">Editor</h2>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/80">
            {editor.dirty ? '● Unsaved edits' : 'Changes show live'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => flow.setReviewOpen(true)}
            disabled={!flow.dirty || flow.saving}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider transition-all ${
              flow.dirty && !flow.saving
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-md hover:from-amber-400 hover:to-yellow-400'
                : 'cursor-not-allowed bg-purple-950/70 text-yellow-100/40'
            }`}
          >
            {flow.saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CloudUpload className="h-3.5 w-3.5" />
            )}
            Save
          </button>
          <Link
            href="/admin"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-purple-800/60 bg-purple-950/70 text-yellow-200/80 transition-colors hover:text-white"
            aria-label="Back to console"
          >
            <X className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="flex gap-2 px-4 pt-4">
        <button
          type="button"
          onClick={() => setTab('section')}
          className={`flex-1 rounded-lg border py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${
            tab === 'section'
              ? 'border-studio-gold/70 bg-studio-purple/70 text-studio-gold'
              : 'border-purple-900/60 bg-purple-950/50 text-yellow-100/60 hover:text-white'
          }`}
        >
          Section
        </button>
        <button
          type="button"
          onClick={() => setTab('site')}
          className={`flex-1 rounded-lg border py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${
            tab === 'site'
              ? 'border-studio-gold/70 bg-studio-purple/70 text-studio-gold'
              : 'border-purple-900/60 bg-purple-950/50 text-yellow-100/60 hover:text-white'
          }`}
        >
          Site-wide
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'site' ? (
          <SiteWideFields />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {PREVIEW_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => selectSection(section.id)}
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    selected === section.id
                      ? 'border-studio-gold/70 bg-studio-gold text-black'
                      : 'border-purple-900/60 bg-purple-950/50 text-yellow-100/70 hover:border-studio-gold/40 hover:text-white'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </div>

            {selected ? (
              <SectionEditor sectionId={selected} />
            ) : (
              <p className="flex items-center gap-2 rounded-xl border border-dashed border-studio-gold/30 p-4 text-xs text-yellow-200/60">
                <MousePointerClick className="h-4 w-4" />
                Click any block in the preview to edit it.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-studio-gold/20 p-3 text-[11px] text-yellow-200/50">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate">{flow.status || 'Edits stay local until you commit.'}</span>
          <button
            type="button"
            onClick={() => void signOut()}
            className="shrink-0 font-semibold text-yellow-100/70 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </div>

      <CommitReviewModal flow={flow} />
    </aside>
  );
}
