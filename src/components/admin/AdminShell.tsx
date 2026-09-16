'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import {
  Palette,
  LayoutGrid,
  Eye,
  Upload,
  LogOut,
  ExternalLink,
  CloudUpload,
  Check,
  Loader2,
} from 'lucide-react';
import { useSite } from '@/context/SiteContext';
import ReviewChangesModal from './ReviewChangesModal';

/** Shared Save & Commit flow: dirty tracking, review modal, commit status. */
export function useCommitFlow() {
  const { editor, save, getPendingChanges } = useSite();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitStatus, setCommitStatus] = useState('');

  const changes = getPendingChanges();

  const handleCommit = useCallback(async () => {
    setIsCommitting(true);
    setCommitStatus('Committing changes directly to the GitHub main branch…');
    try {
      await save();
      setCommitStatus('Committed to GitHub — the live build will pick it up shortly.');
      setReviewOpen(false);
    } catch (err) {
      setCommitStatus(`Error: ${err instanceof Error ? err.message : 'Save failed'}`);
      throw err;
    } finally {
      setIsCommitting(false);
    }
  }, [save]);

  return {
    dirty: editor.dirty,
    saving: editor.saving,
    status: editor.status,
    commitUrl: editor.commitUrl,
    changes,
    reviewOpen,
    setReviewOpen,
    isCommitting,
    commitStatus,
    handleCommit,
  };
}

export type CommitFlow = ReturnType<typeof useCommitFlow>;

export function CommitReviewModal({ flow }: { flow: CommitFlow }) {
  return (
    <ReviewChangesModal
      isOpen={flow.reviewOpen}
      onClose={() => flow.setReviewOpen(false)}
      onConfirm={async () => {
        await flow.handleCommit();
      }}
      changes={flow.changes}
      isCommitting={flow.isCommitting}
      commitStatus={flow.commitStatus}
      commitUrl={flow.commitUrl}
    />
  );
}

const NAV = [
  { href: '/admin', label: 'Console', icon: LayoutGrid, match: 'chooser' },
  { href: '/admin/studio', label: 'No preview', icon: Upload, match: 'studio' },
  { href: '/admin/preview', label: 'With preview', icon: Eye, match: 'preview' },
] as const;

/** Compact console bar for the chooser and the no-preview workspace. */
export function AdminTopBar({
  title,
  subtitle,
  active,
}: {
  title: string;
  subtitle: string;
  active: 'chooser' | 'studio' | 'preview';
}) {
  const { signOut, editor } = useSite();

  return (
    <header className="sticky top-0 z-40 border-b border-studio-gold/25 bg-[#160523]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-studio-gold/40 bg-gradient-to-br from-purple-800/70 via-amber-700/60 to-yellow-600/50">
            <Palette className="h-4 w-4 text-[#ffe76c]" />
          </div>
          <div>
            <h1 className="font-blippo text-lg leading-none tracking-wide text-[#ffe76c]">{title}</h1>
            <p className="mt-1 text-[11px] text-yellow-100/60">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <nav className="hidden items-center gap-1.5 sm:flex">
            {NAV.map((item) => {
              const Icon = item.icon;
              const isActive = item.match === active;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? 'border-studio-gold/70 bg-studio-purple/70 text-studio-gold'
                      : 'border-purple-900/60 bg-purple-950/60 text-yellow-100/75 hover:border-studio-gold/40 hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-900/60 bg-purple-950/60 px-3 py-1.5 text-xs font-semibold text-yellow-100/75 transition-colors hover:border-studio-gold/40 hover:text-white"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Public site</span>
          </Link>

          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-900/60 bg-red-950/50 px-3 py-1.5 text-xs font-semibold text-red-300 transition-colors hover:bg-red-900/70"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Sign out</span>
          </button>
        </div>
      </div>

      {editor.dirty && (
        <div className="border-t border-studio-gold/20 bg-[#1d062e] px-4 py-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300/90 md:px-6">
          Unsaved changes — use Save &amp; Commit to publish
        </div>
      )}
    </header>
  );
}

/** Floating commit bar used by the no-preview workspace. */
export function AdminSavePill({ flow }: { flow: CommitFlow }) {
  return (
    <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-studio-gold/30 bg-[#160523] px-3 py-2 shadow-2xl">
      <span className="hidden max-w-[16rem] truncate pl-2 text-[11px] font-medium text-yellow-100/70 sm:inline">
        {flow.status || 'Changes are stored in this browser until committed'}
      </span>
      {flow.commitUrl ? (
        <a
          href={flow.commitUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800/80 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-50 hover:bg-emerald-700"
        >
          <Check className="h-3.5 w-3.5" />
          View commit
        </a>
      ) : null}
      <button
        type="button"
        disabled={!flow.dirty || flow.saving}
        onClick={() => flow.setReviewOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
          flow.dirty && !flow.saving
            ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-md hover:from-amber-400 hover:to-yellow-400'
            : 'cursor-not-allowed bg-purple-950/70 text-yellow-100/40'
        }`}
      >
        {flow.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CloudUpload className="h-3.5 w-3.5" />}
        {flow.dirty ? 'Review & Commit' : 'All synced'}
      </button>
    </div>
  );
}
