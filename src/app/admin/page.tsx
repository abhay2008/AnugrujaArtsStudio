'use client';

import React from 'react';
import Link from 'next/link';
import {
  Eye,
  Upload,
  Palette,
  LogOut,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useSite } from '@/context/SiteContext';

type Mode = {
  href: string;
  title: string;
  description: string;
  icon: typeof Eye;
  accent: string;
  iconWrap: string;
  workspace: 'studio' | 'preview';
  editMode: boolean;
};

const MODES: Mode[] = [
  {
    href: '/admin/preview',
    workspace: 'preview',
    editMode: true,
    title: 'Show preview while editing',
    description:
      'See the site beside the editor. Click any block, type, and watch it update instantly — still inside this console.',
    icon: Eye,
    accent: 'hover:border-emerald-400/50',
    iconWrap: 'bg-emerald-700 text-emerald-50',
  },
  {
    href: '/admin/studio',
    workspace: 'studio',
    editMode: false,
    title: 'Do not show the preview',
    description:
      'Mass-upload paintings, name each one, set prices and curate galleries on a full-width workspace with no site rendering.',
    icon: Upload,
    accent: 'hover:border-amber-400/50',
    iconWrap: 'bg-amber-700 text-amber-50',
  },
];

/**
 * Studio console landing page.
 *
 * Ported from Jeeva Art School's AdminChooser: two explicit workspaces rather
 * than one flat dashboard — one with a live preview, one without.
 */
export default function AdminChooserPage() {
  const { content, setWorkspace, setEditMode, signOut } = useSite();

  return (
    <div className="min-h-dvh px-4 py-10 md:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-studio-gold/40 bg-gradient-to-br from-purple-800/70 via-amber-700/60 to-yellow-600/50">
                <Palette className="h-5 w-5 text-[#ffe76c]" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-yellow-200/60">
                  Studio console
                </p>
                <p className="text-sm text-yellow-100/70">
                  {content.brand.name} · {content.brand.founder}
                </p>
              </div>
            </div>
            <h1 className="mt-5 font-blippo text-3xl text-[#ffe76c] sm:text-4xl">Admin portal</h1>
            <p className="mt-2 max-w-2xl text-sm text-yellow-100/70">
              This console is separate from the public website. Pick how you want to work — with a live
              preview, or without one.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-xl border border-purple-900/60 bg-purple-950/60 px-3 py-2 text-xs font-semibold text-yellow-100/75 transition-colors hover:border-studio-gold/40 hover:text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Public site
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-900/60 bg-red-950/50 px-3 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-900/70"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {MODES.map((mode) => {
            const Icon = mode.icon;
            return (
              <Link
                key={mode.href}
                href={mode.href}
                onClick={() => {
                  setWorkspace(mode.workspace);
                  setEditMode(mode.editMode);
                }}
                className={`group flex flex-col rounded-3xl border border-studio-gold/25 bg-[#190626]/90 p-6 shadow-lg transition-all hover:shadow-xl ${mode.accent}`}
              >
                <span
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${mode.iconWrap}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="mt-5 font-blippo text-2xl text-[#ffe76c]">{mode.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-yellow-100/70">
                  {mode.description}
                </p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-studio-gold">
                  Open workspace
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>

        <p className="mt-8 flex flex-wrap items-center gap-2 text-[11px] text-yellow-200/50">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          Signed in with an HMAC session cookie — one hour, then you sign in again. Every save is reviewed
          before it is committed to GitHub.
        </p>
      </div>
    </div>
  );
}
