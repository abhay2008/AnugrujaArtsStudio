'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Upload,
  LayoutGrid,
  Settings,
  Eye,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Palette,
  Image as ImageIcon,
  FolderOpen,
  DollarSign,
  Layers,
  ChevronRight,
  Clock,
  ListTree,
} from 'lucide-react';
import { useSite } from '@/context/SiteContext';
import { GALLERY_DEFINITIONS, GalleryKey } from '@/lib/types';
import MassUploadStudio from './MassUploadStudio';
import GalleryManager from './GalleryManager';
import GeneralSettings from './GeneralSettings';
import QuickNavManager from './QuickNavManager';

export default function AdminDashboard() {
  const { content, signOut, editor, getPendingChanges } = useSite();
  const [activeTab, setActiveTab] = useState<'upload' | 'galleries' | 'quicknav' | 'settings'>(
    'upload'
  );

  // Compute live portfolio statistics
  const stats = useMemo(() => {
    let totalArtworks = 0;
    let forSaleCount = 0;
    let totalPricedCount = 0;

    (Object.keys(content.galleries) as GalleryKey[]).forEach((key) => {
      const items = content.galleries[key] || [];
      totalArtworks += items.length;
      items.forEach((item) => {
        if (item.price) totalPricedCount++;
      });
    });

    forSaleCount = (content.galleries.sale || []).length;
    const collectionsCount = GALLERY_DEFINITIONS.length;
    const pendingChangesCount = getPendingChanges().length;

    return {
      totalArtworks,
      forSaleCount,
      totalPricedCount,
      collectionsCount,
      pendingChangesCount,
    };
  }, [content.galleries, getPendingChanges]);

  return (
    <div className="min-h-screen bg-[#100318] text-[#fdf5cf] flex flex-col selection:bg-studio-gold selection:text-black">
      {/* Top Navbar */}
      <header className="h-16 border-b border-studio-gold/30 bg-[#160523]/95 backdrop-blur-md px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-700 via-amber-600 to-yellow-500 p-0.5 shadow-md group cursor-pointer">
            <div className="w-full h-full bg-[#160523] rounded-[14px] flex items-center justify-center text-studio-gold group-hover:scale-105 transition-transform">
              <Palette className="w-5 h-5 text-studio-gold" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-blippo text-xl md:text-2xl text-[#ffe76c] leading-none tracking-wide">
                Anugruja Admin Portal
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                PROD CMS
              </span>
            </div>
            <p className="text-[11px] text-yellow-200/60 font-sans mt-0.5 flex items-center gap-1.5">
              <span>{content.brand.name || 'Anugruja Arts Studio'}</span>
              <span className="text-yellow-200/30">•</span>
              <span>{content.brand.founder || 'Anuradha Govarthanan'}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            target="_blank"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-950/70 border border-purple-800/70 text-yellow-200 hover:text-white hover:border-yellow-400/50 hover:bg-purple-900/70 text-xs font-medium transition-all shadow-xs"
          >
            <Eye className="w-3.5 h-3.5 text-yellow-300" />
            <span>Public Site</span>
            <ExternalLink className="w-3 h-3 text-yellow-200/50" />
          </Link>

          {editor.repoUrl && (
            <a
              href={editor.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/70 border border-purple-800/70 text-yellow-200 hover:text-white text-xs font-medium transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Git-Backed</span>
            </a>
          )}

          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-950/50 border border-red-900/60 hover:bg-red-900/70 text-red-300 text-xs font-semibold transition-all shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </header>

      {/* Main Admin Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6">
        {/* Studio Summary Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Total Artworks */}
          <div className="p-4 rounded-2xl bg-[#190626]/90 border border-studio-gold/25 hover:border-studio-gold/50 shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-200/60">
                Total Artworks
              </span>
              <div className="p-1.5 rounded-lg bg-purple-950/80 text-studio-gold border border-purple-800/60">
                <ImageIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-blippo text-2xl md:text-3xl text-[#ffe76c]">
                {stats.totalArtworks}
              </span>
              <span className="text-xs text-yellow-100/50">live items</span>
            </div>
          </div>

          {/* Active Collections */}
          <div className="p-4 rounded-2xl bg-[#190626]/90 border border-studio-gold/25 hover:border-studio-gold/50 shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-200/60">
                Galleries
              </span>
              <div className="p-1.5 rounded-lg bg-purple-950/80 text-amber-300 border border-purple-800/60">
                <FolderOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-blippo text-2xl md:text-3xl text-amber-300">
                {stats.collectionsCount}
              </span>
              <span className="text-xs text-yellow-100/50">categories</span>
            </div>
          </div>

          {/* Available for Sale */}
          <div className="p-4 rounded-2xl bg-[#190626]/90 border border-studio-gold/25 hover:border-studio-gold/50 shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-200/60">
                Art for Sale
              </span>
              <div className="p-1.5 rounded-lg bg-purple-950/80 text-emerald-400 border border-purple-800/60">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-blippo text-2xl md:text-3xl text-emerald-300">
                {stats.forSaleCount}
              </span>
              <span className="text-xs text-yellow-100/50">paintings</span>
            </div>
          </div>

          {/* Git / Sync Status */}
          <div className="p-4 rounded-2xl bg-[#190626]/90 border border-studio-gold/25 hover:border-studio-gold/50 shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-200/60">
                Pending Commits
              </span>
              <div className="p-1.5 rounded-lg bg-purple-950/80 text-yellow-300 border border-purple-800/60">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-blippo text-2xl md:text-3xl text-yellow-300">
                {stats.pendingChangesCount}
              </span>
              <span className="text-xs text-yellow-100/50">
                {stats.pendingChangesCount === 0 ? 'fully synchronized' : 'unsaved changes'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 border-b border-purple-900/60 pb-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('upload')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all shrink-0 ${
              activeTab === 'upload'
                ? 'bg-studio-purple text-studio-gold border border-studio-gold/70 shadow-[0_0_15px_rgba(242,215,112,0.25)]'
                : 'text-yellow-100/70 hover:text-white hover:bg-purple-950/60 border border-transparent'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Mass Upload Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('galleries')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all shrink-0 ${
              activeTab === 'galleries'
                ? 'bg-studio-purple text-studio-gold border border-studio-gold/70 shadow-[0_0_15px_rgba(242,215,112,0.25)]'
                : 'text-yellow-100/70 hover:text-white hover:bg-purple-950/60 border border-transparent'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Manage Galleries &amp; Artworks</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-black/40 text-yellow-300">
              {stats.totalArtworks}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('quicknav')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all shrink-0 ${
              activeTab === 'quicknav'
                ? 'bg-studio-purple text-studio-gold border border-studio-gold/70 shadow-[0_0_15px_rgba(242,215,112,0.25)]'
                : 'text-yellow-100/70 hover:text-white hover:bg-purple-950/60 border border-transparent'
            }`}
          >
            <ListTree className="w-4 h-4" />
            <span>Pages &amp; Listings</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all shrink-0 ${
              activeTab === 'settings'
                ? 'bg-studio-purple text-studio-gold border border-studio-gold/70 shadow-[0_0_15px_rgba(242,215,112,0.25)]'
                : 'text-yellow-100/70 hover:text-white hover:bg-purple-950/60 border border-transparent'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Brand &amp; SEO</span>
          </button>
        </div>

        {/* Tab Content Display */}
        <div className="pb-24">
          {activeTab === 'upload' && <MassUploadStudio />}
          {activeTab === 'galleries' && <GalleryManager />}
          {activeTab === 'quicknav' && <QuickNavManager />}
          {activeTab === 'settings' && <GeneralSettings />}
        </div>
      </div>
    </div>
  );
}
