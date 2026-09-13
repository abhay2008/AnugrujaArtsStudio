'use client';

import { useState } from 'react';
import Image from 'next/image';
import AutoScroller from '@/components/AutoScroller';
import InteractiveSlideshow from '@/components/InteractiveSlideshow';
import ContactActionButtons from '@/components/ContactActionButtons';
import { saleGallery, commissionGallery, studioMeta } from '@/data/artData';
import { useLightbox } from '@/components/LightboxContext';
import { ShoppingBag, Sparkles, ExternalLink, Grid, LayoutList } from 'lucide-react';

export default function SaleClient() {
  const { openLightbox } = useLightbox();
  const [viewMode, setViewMode] = useState<'grid' | 'slideshow'>('grid');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-16">
      {/* Page Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-pill text-xs text-studio-sunset mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Original Artworks &amp; Commissions</span>
        </div>
        <h1 className="font-decorative text-4xl sm:text-6xl gold-sunset-shimmer font-bold tracking-wide">
          Art for sale
        </h1>
        <p className="font-editorial text-xl sm:text-3xl text-amber-200 font-medium">
          Anuradha Govarthanan &mdash; Master Artist &amp; Founder
        </p>
        <p className="font-editorial text-lg sm:text-xl text-studio-gold/90 italic">
          Handcrafted Water Colour Paintings, Landscapes &amp; Photorealistic Art
        </p>
      </div>

      {/* 1. Painting Catalog for Sale */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-studio-gold/30 pb-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-studio-sunset" />
            <h2 className="font-decorative text-2xl sm:text-3xl text-studio-gold font-bold">
              Available Paintings ({saleGallery.length} Pieces)
            </h2>
          </div>

          {/* Toggle between Grid and Slideshow view — 44px min touch target */}
          <div className="inline-flex rounded-xl glass-pill p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`touch-target min-h-[44px] flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-blippo transition-all ${
                viewMode === 'grid'
                  ? 'bg-studio-sunset text-white shadow-lg'
                  : 'text-amber-100/70 hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>Full Grid</span>
            </button>
            <button
              onClick={() => setViewMode('slideshow')}
              className={`touch-target min-h-[44px] flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-blippo transition-all ${
                viewMode === 'slideshow'
                  ? 'bg-studio-sunset text-white shadow-lg'
                  : 'text-amber-100/70 hover:text-white'
              }`}
            >
              <LayoutList className="w-4 h-4" />
              <span>Slideshow</span>
            </button>
          </div>
        </div>

        {/* View Mode: Interactive Grid with Next.js fast lazy-loading */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {saleGallery.map((art, idx) => (
              <div
                key={art.id}
                onClick={() => openLightbox(art.src, art.title)}
                className="group relative h-48 sm:h-56 rounded-2xl overflow-hidden glass-card border border-white/10 hover:border-studio-sunset/60 shadow-md hover:shadow-[0_12px_30px_rgba(249,115,22,0.25)] transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 cursor-pointer bg-studio-dark/90"
              >
                <Image
                  src={art.src}
                  alt={art.title}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
                  loading={idx < 6 ? 'eager' : 'lazy'}
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                  <span className="text-xs font-decorative font-bold text-studio-gold truncate">
                    {art.title}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-panel rounded-3xl p-3 sm:p-6 shadow-2xl">
            <InteractiveSlideshow items={saleGallery} />
          </div>
        )}

        {/* Instagram catalog link */}
        <div className="text-center pt-4">
          <a
            href={studioMeta.instagramSaleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="glass-btn-sunset inline-flex items-center gap-2 min-h-[48px] px-8 py-3.5 rounded-2xl text-white font-bold text-base sm:text-lg active:scale-95 shadow-xl"
          >
            <span>View more on Instagram</span>
            <ExternalLink className="w-4 h-4 text-amber-200" />
          </a>
        </div>
      </section>

      <hr className="border-t border-studio-gold/20 max-w-4xl mx-auto w-full" />

      {/* 2. Commissioned Artwork Section */}
      <section id="commission" className="glass-panel-sunset p-6 sm:p-10 rounded-3xl space-y-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-3 border-b border-studio-sunset/20 pb-4">
          <Sparkles className="w-8 h-8 text-studio-sunset" />
          <div>
            <h2 className="font-decorative text-2xl sm:text-4xl text-studio-gold font-bold">
              Commissioned Artwork
            </h2>
            <p className="font-editorial text-lg sm:text-xl text-amber-200/90 italic">
              Get Customised Handcrafted Artwork
            </p>
          </div>
        </div>

        <div className="glass-card p-5 sm:p-6 rounded-2xl border border-white/10 space-y-3 font-serif-display text-sm sm:text-base text-yellow-100/90">
          <ul className="space-y-2.5">
            <li>• <strong className="text-studio-gold">Portraits:</strong> Single portrait, couple portraits, family portrait commissions available.</li>
            <li>• <strong className="text-studio-gold">Mediums:</strong> Acrylic, pencil, charcoal, oil, and transparent watercolors.</li>
            <li>• <strong className="text-studio-gold">Tailored Sizes:</strong> Customized canvas and paper sizes for residential, gallery, and corporate spaces.</li>
            <li>• <strong className="text-studio-gold">Themes:</strong> Customized paintings of traditional Indian deities, serene landscapes, heritage architecture, and grand wall murals.</li>
          </ul>
        </div>

        {/* Commissioned Work Scroller */}
        <AutoScroller items={commissionGallery} itemHeight="h-72" />
      </section>

      {/* Direct Inquiries Action Bridge */}
      <section className="text-center">
        <p className="font-editorial text-xl sm:text-2xl text-studio-gold mb-4 italic">
          Have an idea or custom portrait in mind? Contact Master Artist Anuradha directly:
        </p>
        <ContactActionButtons />
      </section>
    </div>
  );
}
