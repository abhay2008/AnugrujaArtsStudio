'use client';

import Image from 'next/image';
import Carousel3D from '@/components/Carousel3D';
import AutoScroller from '@/components/AutoScroller';
import ContactActionButtons from '@/components/ContactActionButtons';
import { saleGallery, commissionGallery, studioMeta } from '@/data/artData';
import { useLightbox } from '@/components/LightboxContext';
import { formatPrice } from '@/lib/price';
import { ShoppingBag, Sparkles, ExternalLink } from 'lucide-react';

export default function SaleClient() {
  const { openLightbox } = useLightbox();

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

      {/* 1. Painting Catalog for Sale — 3D carousel with full catalog grid below */}
      <section className="space-y-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-studio-gold/30 pb-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-studio-sunset" />
            <h2 className="font-decorative text-2xl sm:text-3xl text-studio-gold font-bold">
              Available Paintings ({saleGallery.length} Pieces)
            </h2>
          </div>
        </div>

        {/* 3D coverflow carousel with name + price plates */}
        <Carousel3D items={saleGallery} variant="spotlight" autoAdvanceIntervalMs={4600} />

        {/* Browsable full-catalog grid (lazy loaded, tap to zoom) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {saleGallery.map((art) => (
            <div
              key={art.id}
              onClick={() => openLightbox(art.src, art.title)}
              className="group relative h-48 sm:h-56 rounded-2xl overflow-hidden glass-card border border-theme hover:border-studio-sunset/60 shadow-md hover:shadow-[0_12px_30px_rgba(249,115,22,0.25)] transition-all duration-300 transform hover:-translate-y-1 cursor-pointer bg-studio-dark/90"
            >
              <Image
                src={art.src}
                alt={art.title}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
                /* Lazy everywhere: the browser already fetches whatever is in
                   view immediately, so six eager tiles above the fold only
                   competed with the carousel for bandwidth on slow links. */
                loading="lazy"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex flex-col gap-0.5 p-2.5">
                <span className="text-xs font-decorative font-bold text-studio-gold truncate">
                  {art.title}
                </span>
                {art.price && (
                  <span className="text-[11px] font-mono font-bold text-emerald-300">
                    {formatPrice(art.price)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

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

        <div className="glass-card p-5 sm:p-6 rounded-2xl border border-theme space-y-3 font-serif-display text-sm sm:text-base text-yellow-100/90">
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
