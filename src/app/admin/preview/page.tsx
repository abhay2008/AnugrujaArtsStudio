'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, LayoutGrid } from 'lucide-react';
import { useSite } from '@/context/SiteContext';
import LiveSitePreview from '@/components/admin/LiveSitePreview';
import PreviewEditorPane from '@/components/admin/PreviewEditorPane';

/**
 * "Show preview while editing" workspace.
 *
 * Left: the site rendered from the same CMS state the editor writes to.
 * Right: the section editor. Everything the editor touches lands in the
 * preview on the next keystroke — nothing is committed until Save.
 */
export default function AdminPreviewPage() {
  const { setWorkspace, setEditMode } = useSite();

  useEffect(() => {
    setWorkspace('preview');
    setEditMode(true);
    return () => setEditMode(false);
  }, [setEditMode, setWorkspace]);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden md:flex-row">
      {/* Narrow screens stack the panes (site above, editor below); wide screens split them. */}
      <div className="relative flex h-[45vh] min-h-0 shrink-0 flex-col md:h-auto md:flex-1">
        <div
          id="site-preview"
          data-theme="dark"
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#0f0818]"
        >
          <LiveSitePreview />
        </div>

        {/* Floating workspace switcher, mirroring the studio console's pill. */}
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-40 hidden -translate-x-1/2 lg:block">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-studio-gold/30 bg-[#160523]/95 px-3 py-2 shadow-2xl backdrop-blur-md">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-full bg-purple-950/70 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-yellow-100/80 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Console
            </Link>
            <Link
              href="/admin/studio"
              className="inline-flex items-center gap-1.5 rounded-full bg-purple-950/70 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-yellow-100/80 transition-colors hover:text-white"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              No-preview studio
            </Link>
          </div>
        </div>
      </div>

      <PreviewEditorPane />
    </div>
  );
}
