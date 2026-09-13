'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
  Edit2,
  Check,
  LayoutGrid,
  List,
  Search,
  Hash,
  X,
  Sparkles,
  MoveRight,
} from 'lucide-react';
import { useSite } from '@/context/SiteContext';
import { GALLERY_DEFINITIONS, GalleryKey, ArtItem } from '@/lib/types';
import DeleteArtworkModal from './DeleteArtworkModal';

export default function GalleryManager() {
  const { content, reorderGallery, moveArtworkToPosition, updateArtwork, removeArtwork } = useSite();
  const [selectedGallery, setSelectedGallery] = useState<GalleryKey>('featured');
  const [viewMode, setViewMode] = useState<'cards' | 'quick'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [jumpTargetItem, setJumpTargetItem] = useState<{ id: string; title: string; currentPos: number } | null>(null);
  const [jumpPosInput, setJumpPosInput] = useState('');
  const [editingItem, setEditingItem] = useState<{ id: string; title: string; price: string; category: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ArtItem | null>(null);

  const galleryDef = GALLERY_DEFINITIONS.find((g) => g.key === selectedGallery) || GALLERY_DEFINITIONS[0];
  const allItems = content.galleries[selectedGallery] || [];

  // Filter items if search query is present
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allItems.map((item, idx) => ({ item, originalIdx: idx }));
    return allItems
      .map((item, idx) => ({ item, originalIdx: idx }))
      .filter(
        ({ item }) =>
          item.title.toLowerCase().includes(q) ||
          (item.category && item.category.toLowerCase().includes(q)) ||
          (item.price && String(item.price).toLowerCase().includes(q))
      );
  }, [allItems, searchQuery]);

  const handleSaveEdit = () => {
    if (!editingItem) return;
    updateArtwork(selectedGallery, editingItem.id, {
      title: editingItem.title,
      price: editingItem.price,
      category: editingItem.category,
    });
    setEditingItem(null);
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jumpTargetItem) return;
    const target = parseInt(jumpPosInput, 10);
    if (!isNaN(target) && target >= 1 && target <= allItems.length) {
      moveArtworkToPosition(selectedGallery, jumpTargetItem.id, target);
      setJumpTargetItem(null);
      setJumpPosInput('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Gallery Selector Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-studio-gold/20 pb-4">
        {GALLERY_DEFINITIONS.map((def) => {
          const count = (content.galleries[def.key] || []).length;
          const isActive = def.key === selectedGallery;
          return (
            <button
              key={def.key}
              onClick={() => {
                setSelectedGallery(def.key);
                setEditingItem(null);
                setSearchQuery('');
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-studio-purple text-studio-gold border border-studio-gold shadow-[0_0_15px_rgba(242,215,112,0.25)] font-bold'
                  : 'bg-[#1e072e]/60 text-yellow-100/70 hover:text-white hover:bg-purple-900/40 border border-purple-900/30'
              }`}
            >
              <span>{def.label}</span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-black/40 text-yellow-300 font-mono">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-blippo text-2xl text-[#ffe76c]">{galleryDef.label}</h2>
            <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
              {allItems.length} total
            </span>
          </div>
          <p className="text-sm text-yellow-100/70 mt-0.5">{galleryDef.description}</p>
        </div>

        {/* Search & View Mode Switcher */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64 lg:w-72">
            <Search className="w-4 h-4 text-yellow-200/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by title or price..."
              className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-[#190626] border border-studio-gold/30 text-yellow-100 text-xs focus:outline-none focus:border-yellow-300 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-yellow-200/50 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Card / List Switcher */}
          <div className="inline-flex rounded-xl bg-[#1a0528] border border-studio-gold/40 p-1 shrink-0">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'cards' ? 'bg-studio-purple text-studio-gold shadow' : 'text-yellow-100/70 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode('quick')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'quick' ? 'bg-studio-purple text-studio-gold shadow' : 'text-yellow-100/70 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table / List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Items Rendering */}
      {allItems.length === 0 ? (
        <div className="text-center py-16 p-8 rounded-3xl bg-[#1b052a]/60 border border-purple-900/40">
          <p className="text-yellow-200/60 font-medium text-base">No artworks currently in this collection.</p>
          <p className="text-xs text-yellow-200/40 mt-1">Use the Mass Upload Studio tab above to add artworks here.</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 p-8 rounded-3xl bg-[#1b052a]/60 border border-purple-900/40">
          <p className="text-yellow-200/60 font-medium">No artworks match &quot;{searchQuery}&quot;</p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="mt-2 text-xs text-studio-gold underline hover:text-yellow-200"
          >
            Clear search filter
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* Card View with in-place title, category, price edit and positioning */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map(({ item, originalIdx: idx }) => (
            <div
              key={item.id}
              className="rounded-2xl bg-[#190626] border border-studio-gold/30 overflow-hidden shadow-xl flex flex-col group hover:border-studio-gold/80 transition-all hover:shadow-[0_4px_25px_rgba(0,0,0,0.5)]"
            >
              {/* Artwork Preview Image */}
              <div className="relative w-full h-56 bg-black/40">
                <Image
                  src={item.src}
                  alt={item.title}
                  fill
                  className="object-contain p-2"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md text-xs font-mono font-bold text-studio-gold border border-studio-gold/40 shadow-xs">
                  #{idx + 1}
                </span>

                {/* Jump to Position Trigger */}
                <button
                  type="button"
                  title="Jump to specific position"
                  onClick={() => {
                    setJumpTargetItem({ id: item.id, title: item.title, currentPos: idx + 1 });
                    setJumpPosInput(String(idx + 1));
                  }}
                  className="absolute top-2.5 right-2.5 px-2 py-1 rounded-md bg-purple-950/85 hover:bg-purple-900 text-yellow-200 text-[11px] font-mono border border-purple-800/60 backdrop-blur-md flex items-center gap-1 transition-colors"
                >
                  <Hash className="w-3 h-3 text-studio-gold" />
                  <span>Pos</span>
                </button>
              </div>

              {/* Artwork Metadata */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                {editingItem?.id === item.id ? (
                  <div className="space-y-3 animate-fadeIn">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-yellow-200/60">Title</label>
                      <input
                        type="text"
                        value={editingItem.title}
                        onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                        className="w-full mt-1 px-3 py-1.5 rounded-lg bg-[#270b3b] border border-studio-gold/40 text-xs text-yellow-100 focus:outline-none focus:border-yellow-300"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-yellow-200/60">Category</label>
                      <input
                        type="text"
                        value={editingItem.category}
                        onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                        className="w-full mt-1 px-3 py-1.5 rounded-lg bg-[#270b3b] border border-studio-gold/40 text-xs text-yellow-100 focus:outline-none focus:border-yellow-300"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-yellow-200/60">Price (optional)</label>
                      <input
                        type="text"
                        value={editingItem.price}
                        placeholder="e.g. ₹4,500"
                        onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                        className="w-full mt-1 px-3 py-1.5 rounded-lg bg-[#270b3b] border border-studio-gold/40 text-xs text-yellow-100 focus:outline-none focus:border-yellow-300"
                      />
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        onClick={() => setEditingItem(null)}
                        className="px-3 py-1 rounded-md text-xs bg-purple-950 text-yellow-200 hover:bg-purple-900 border border-purple-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="inline-flex items-center gap-1 px-3.5 py-1 rounded-md text-xs bg-amber-500 text-black font-bold hover:bg-amber-400 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h4 className="font-bold text-base text-[#fdf5cf] line-clamp-1">{item.title}</h4>
                    <p className="text-xs text-studio-gold font-medium mt-0.5">{item.category || galleryDef.defaultCategory}</p>
                    {item.price ? (
                      <p className="text-sm font-mono text-emerald-300 font-bold mt-1.5">{item.price}</p>
                    ) : (
                      <p className="text-xs text-yellow-200/30 italic mt-1.5">No price set</p>
                    )}
                  </div>
                )}

                {/* Steppers & Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-purple-900/40">
                  <div className="flex items-center gap-1">
                    <button
                      title="Move to top (1st position)"
                      disabled={idx === 0}
                      onClick={() => moveArtworkToPosition(selectedGallery, item.id, 1)}
                      className="p-1.5 rounded-lg bg-purple-950/80 text-yellow-200 hover:bg-purple-800 disabled:opacity-30 border border-purple-900/60"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button
                      title="Move backward 1 slot"
                      disabled={idx === 0}
                      onClick={() => reorderGallery(selectedGallery, idx, idx - 1)}
                      className="p-1.5 rounded-lg bg-purple-950/80 text-yellow-200 hover:bg-purple-800 disabled:opacity-30 border border-purple-900/60"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button
                      title="Move forward 1 slot"
                      disabled={idx === allItems.length - 1}
                      onClick={() => reorderGallery(selectedGallery, idx, idx + 1)}
                      className="p-1.5 rounded-lg bg-purple-950/80 text-yellow-200 hover:bg-purple-800 disabled:opacity-30 border border-purple-900/60"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      title="Move to end"
                      disabled={idx === allItems.length - 1}
                      onClick={() => moveArtworkToPosition(selectedGallery, item.id, allItems.length)}
                      className="p-1.5 rounded-lg bg-purple-950/80 text-yellow-200 hover:bg-purple-800 disabled:opacity-30 border border-purple-900/60"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {editingItem?.id !== item.id && (
                      <button
                        title="Edit artwork details"
                        onClick={() =>
                          setEditingItem({
                            id: item.id,
                            title: item.title,
                            price: String(item.price || ''),
                            category: item.category || galleryDef.defaultCategory,
                          })
                        }
                        className="p-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-800 text-yellow-200 border border-purple-900/60 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      title="Delete artwork"
                      onClick={() => setDeleteTarget(item)}
                      className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-900/50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Quick Arrange List / Table View */
        <div className="space-y-2">
          {filteredItems.map(({ item, originalIdx: idx }) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-xl bg-[#190626] border border-studio-gold/25 hover:border-studio-gold/60 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="w-9 text-center text-xs font-mono font-bold text-studio-gold bg-black/40 py-1 px-1.5 rounded-md border border-purple-900">
                  #{idx + 1}
                </span>
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-black/40 border border-purple-900 shrink-0">
                  <Image src={item.src} alt={item.title} fill className="object-cover" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#fdf5cf] leading-tight">{item.title}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-yellow-200/60">{item.category || galleryDef.defaultCategory}</span>
                    {item.price && (
                      <span className="text-xs font-mono text-emerald-300 font-semibold">• {item.price}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button
                    title="Jump position"
                    onClick={() => {
                      setJumpTargetItem({ id: item.id, title: item.title, currentPos: idx + 1 });
                      setJumpPosInput(String(idx + 1));
                    }}
                    className="p-1.5 rounded-lg bg-purple-950 text-yellow-200 hover:bg-purple-800 border border-purple-900/60 text-xs font-mono"
                  >
                    #{idx + 1}
                  </button>
                  <button
                    disabled={idx === 0}
                    onClick={() => reorderGallery(selectedGallery, idx, idx - 1)}
                    className="p-1.5 rounded-lg bg-purple-950 text-yellow-200 hover:bg-purple-800 disabled:opacity-30 border border-purple-900/60"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={idx === allItems.length - 1}
                    onClick={() => reorderGallery(selectedGallery, idx, idx + 1)}
                    className="p-1.5 rounded-lg bg-purple-950 text-yellow-200 hover:bg-purple-800 disabled:opacity-30 border border-purple-900/60"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => setDeleteTarget(item)}
                  className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-900/50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Jump to Position Modal */}
      {jumpTargetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-sm rounded-2xl bg-[#1d062e] border border-studio-gold/60 shadow-2xl p-6 text-[#fdf5cf] space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-blippo text-xl text-[#ffe76c]">Move Artwork Position</h3>
                <p className="text-xs text-yellow-100/70 mt-0.5 line-clamp-1">&quot;{jumpTargetItem.title}&quot;</p>
              </div>
              <button
                onClick={() => setJumpTargetItem(null)}
                className="p-1 rounded-lg hover:bg-purple-900/60 text-yellow-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleJumpSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-yellow-200/70 mb-1">
                  Target Slot (1 to {allItems.length})
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-yellow-200/50">Current: #{jumpTargetItem.currentPos}</span>
                  <MoveRight className="w-3.5 h-3.5 text-yellow-200/40" />
                  <input
                    type="number"
                    min={1}
                    max={allItems.length}
                    value={jumpPosInput}
                    onChange={(e) => setJumpPosInput(e.target.value)}
                    autoFocus
                    className="w-24 px-3 py-1.5 rounded-xl bg-[#280a3e] border border-studio-gold/50 text-yellow-100 text-sm font-mono font-bold focus:outline-none focus:border-yellow-300"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setJumpTargetItem(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-950 border border-purple-800 text-yellow-100 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold text-xs shadow-md hover:from-amber-400 hover:to-yellow-400"
                >
                  Reposition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <DeleteArtworkModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            removeArtwork(selectedGallery, deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        artwork={deleteTarget}
        galleryLabel={galleryDef.label}
      />
    </div>
  );
}
