'use client';

import React, { useState, useMemo } from 'react';
import {
  Upload,
  LayoutGrid,
  Settings,
  Palette,
  Image as ImageIcon,
  FolderOpen,
  DollarSign,
  Clock,
  ListTree,
} from 'lucide-react';
import { useSite } from '@/context/SiteContext';
import { GALLERY_DEFINITIONS, GalleryKey } from '@/lib/types';
import MassUploadStudio from './MassUploadStudio';
import GalleryManager from './GalleryManager';
import GeneralSettings from './GeneralSettings';
import QuickNavManager from './QuickNavManager';
import { AdminSavePill, type CommitFlow } from './AdminShell';

type ConsoleTab = 'upload' | 'galleries' | 'quicknav' | 'settings';

const TABS: { id: ConsoleTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'upload', label: 'Mass Upload Studio', icon: Upload },
  { id: 'galleries', label: 'Galleries & Artworks', icon: LayoutGrid },
  { id: 'quicknav', label: 'Pages & Listings', icon: ListTree },
  { id: 'settings', label: 'Brand & SEO', icon: Settings },
];

/**
 * The "no preview" workspace: upload, curate and configure without rendering
 * the site. Same panels as before, now without the public page chrome.
 */
export default function StudioConsole({ flow }: { flow: CommitFlow }) {
  const { content, getPendingChanges } = useSite();
  const [activeTab, setActiveTab] = useState<ConsoleTab>('upload');

  const stats = useMemo(() => {
    let totalArtworks = 0;
    let totalPricedCount = 0;

    (Object.keys(content.galleries) as GalleryKey[]).forEach((key) => {
      const items = content.galleries[key] || [];
      totalArtworks += items.length;
      items.forEach((item) => {
        if (item.price) totalPricedCount++;
      });
    });

    return {
      totalArtworks,
      forSaleCount: (content.galleries.sale || []).length,
      totalPricedCount,
      collectionsCount: GALLERY_DEFINITIONS.length,
      pendingChangesCount: getPendingChanges().length,
    };
  }, [content.galleries, getPendingChanges]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <StatCard label="Total Artworks" value={stats.totalArtworks} note="live items" icon={ImageIcon} tone="gold" />
        <StatCard label="Galleries" value={stats.collectionsCount} note="categories" icon={FolderOpen} tone="amber" />
        <StatCard label="Art for Sale" value={stats.forSaleCount} note="paintings" icon={DollarSign} tone="emerald" />
        <StatCard
          label="Pending Commits"
          value={stats.pendingChangesCount}
          note={stats.pendingChangesCount === 0 ? 'fully synchronized' : 'unsaved changes'}
          icon={Clock}
          tone="yellow"
        />
      </div>

      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto border-b border-purple-900/60 pb-3">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-all ${
                active
                  ? 'border-studio-gold/70 bg-studio-purple text-studio-gold shadow-[0_0_15px_rgba(242,215,112,0.25)]'
                  : 'border-transparent text-yellow-100/70 hover:bg-purple-950/60 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.id === 'galleries' && (
                <span className="rounded-full bg-black/40 px-2 py-0.5 font-mono text-xs font-bold text-yellow-300">
                  {stats.totalArtworks}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="pb-24">
        {activeTab === 'upload' && <MassUploadStudio />}
        {activeTab === 'galleries' && <GalleryManager />}
        {activeTab === 'quicknav' && <QuickNavManager />}
        {activeTab === 'settings' && <GeneralSettings />}
      </div>

      {/*
        The upload studio ships its own review-and-commit bar inline, so the
        floating pill would only collide with it; it appears for the other tabs.
      */}
      {activeTab !== 'upload' && <AdminSavePill flow={flow} />}
    </div>
  );
}

function StatCard({
  label,
  value,
  note,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  note: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'gold' | 'amber' | 'emerald' | 'yellow';
}) {
  const toneClass = {
    gold: 'text-studio-gold',
    amber: 'text-amber-300',
    emerald: 'text-emerald-300',
    yellow: 'text-yellow-300',
  }[tone];

  return (
    <div className="rounded-2xl border border-studio-gold/25 bg-[#190626]/90 p-4 shadow-lg transition-all hover:border-studio-gold/50">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-200/60">{label}</span>
        <div className="rounded-lg border border-purple-800/60 bg-purple-950/80 p-1.5 text-studio-gold">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`font-blippo text-2xl md:text-3xl ${toneClass}`}>{value}</span>
        <span className="text-xs text-yellow-100/50">{note}</span>
      </div>
    </div>
  );
}
