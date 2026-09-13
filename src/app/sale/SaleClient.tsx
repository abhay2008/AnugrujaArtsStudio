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
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-16">
      {/* Page Header */}
      <div className="text-center space-y-3">
        <h1 className="font-blippo text-4xl md:text-6xl text-[#ffe76c] font-black tracking-wide">
          Art for sale
        </h1>
        <p className="font-blippo text-xl md:text-2xl text-[#fdf5cf] font-bold">
          Anuradha Govarthanan — A Professional Artist
        </p>
        <p className="font-luminari text-xl text-[#d1a515]">
          Water Colour Paintings and Realistic Artwork
        </p>
      </div>

      {/* 1. Painting Catalog for Sale */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-studio-gold/30 pb-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-studio-gold" />
            <h2 className="font-blippo text-2xl md:text-3xl text-[#ffe76c]">
              Available Paintings ({saleGallery.length} Pieces)
            </h2>
          </div>

          {/* Toggle between Grid and Slideshow view */}
          <div className="inline-flex rounded-xl bg-studio-dark border border-studio-gold/40 p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'grid'
                  ? 'bg-studio-purple text-studio-gold shadow-md'
                  : 'text-yellow-100/70 hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>Full Grid</span>
            </button>
            <button
              onClick={() => setViewMode('slideshow')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'slideshow'
                  ? 'bg-studio-purple text-studio-gold shadow-md'
                  : 'text-yellow-100/70 hover:text-white'
              }`}
            >
              <LayoutList className="w-4 h-4" />
              <span>Slideshow</span>
            </button>
          </div>
        </div>

        {/* View Mode: Interactive Grid with Next.js fast lazy-loading */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {saleGallery.map((art, idx) => (
              <div
                key={art.id}
                onClick={() => openLightbox(art.src, art.title)}
                className="group relative h-48 md:h-56 rounded-xl overflow-hidden border-2 border-studio-gold/60 hover:border-yellow-300 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 cursor-pointer bg-studio-dark"
              >
                <Image
                  src={art.src}
                  alt={art.title}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
                  loading={idx < 6 ? 'eager' : 'lazy'}
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <span className="text-xs font-blippo text-studio-gold truncate">
                    {art.title}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <InteractiveSlideshow items={saleGallery} />
        )}

        {/* Instagram catalog link */}
        <div className="text-center pt-4">
          <a
            href={studioMeta.instagramSaleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#370e55] border-2 border-purple-300 text-studio-gold font-bold text-lg hover:border-yellow-400 hover:scale-105 transition-all shadow-xl"
          >
            <span>View more on Instagram</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </section>

      <hr className="border-t border-studio-gold/20" />

      {/* 2. Commissioned Artwork Section */}
      <section id="commission" className="p-6 md:p-10 rounded-2xl bg-[#1c072c]/90 border border-studio-gold/30 shadow-2xl backdrop-blur-sm space-y-6">
        <div className="flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-[#ffe76c]" />
          <div>
            <h2 className="font-blippo text-3xl md:text-5xl text-[#ffe76c] font-black">
              Commissioned Artwork
            </h2>
            <p className="font-luminari text-xl text-[#d1a515]">
              Get Customised Handcrafted Artwork
            </p>
          </div>
        </div>

        <ul className="space-y-2 text-yellow-100/90 text-base md:text-lg">
          <li>• <strong>Portraits:</strong> Single portrait, couple portraits, family portrait commissions available.</li>
          <li>• <strong className="text-studio-gold">Mediums:</strong> Acrylic, pencil, charcoal, oil, and transparent watercolors.</li>
          <li>• <strong className="text-studio-gold">Tailored Sizes:</strong> Customized canvas and paper sizes for residential and corporate spaces.</li>
          <li>• <strong className="text-studio-gold">Themes:</strong> Customized paintings of traditional Indian deities, serene landscapes, heritage architecture, and grand wall murals.</li>
        </ul>

        {/* Commissioned Work Scroller */}
        <AutoScroller items={commissionGallery} itemHeight="h-72" />
      </section>

      {/* Direct Inquiries Action Bridge */}
      <section className="text-center">
        <p className="font-blippo text-xl text-studio-gold mb-4">
          Have an idea or custom portrait in mind? Contact Master Artist Anuradha directly:
        </p>
        <ContactActionButtons />
      </section>
    </div>
  );
}
