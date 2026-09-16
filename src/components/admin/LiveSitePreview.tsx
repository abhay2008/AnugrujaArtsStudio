'use client';

import React from 'react';
import Image from 'next/image';
import { Eye, MapPin, Phone, Mail, ArrowRight } from 'lucide-react';
import { useSite } from '@/context/SiteContext';
import Carousel3D from '@/components/Carousel3D';
import EditableSection from './EditableSection';

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/sale', label: 'Art for Sale' },
  { href: '/classes', label: 'Classes' },
  { href: '/about', label: 'About' },
];

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full glass-pill px-3 py-1 text-section-kicker text-studio-sunset">
      {children}
    </span>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-decorative text-section-title font-bold text-studio-gold">{children}</h2>
  );
}

/**
 * Context-driven rendering of the studio's public home page.
 *
 * Everything CMS-backed (brand, hero banner, galleries, about block, quick-nav
 * shortcuts) reads straight from the same SiteContext the editor writes to, so
 * a keystroke in the editor panel shows up here immediately.
 */
export default function LiveSitePreview() {
  const { content } = useSite();
  const banner = content.sections?.banner;
  const aboutArtist = content.sections?.aboutArtist;
  const courses = content.sections?.courses;
  const quickNav = content.sections?.pageMeta?.quickNav ?? [];
  const { brand, galleries, social } = content;
  const featured = galleries?.featured ?? [];
  const sale = galleries?.sale ?? [];
  const classes = galleries?.classes ?? [];

  return (
    <div className="relative">
      {editingBadge()}

      {/* Real header strip, bound to brand fields. */}
      <EditableSection id="brand" label="Header">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[var(--border-soft)] bg-[#12041d]/95 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="logo-chrome relative h-9 w-9 overflow-hidden rounded-full border border-studio-gold/40">
              <Image src={banner?.logo || '/images/logo.png'} alt={brand.name} fill sizes="36px" className="object-contain p-0.5" />
            </span>
            <span className="font-decorative text-base font-bold gold-sunset-shimmer">{brand.name}</span>
          </div>
          <nav className="hidden items-center gap-4 sm:flex">
            {NAV_ITEMS.map((item) => (
              <span key={item.href} className="text-xs font-semibold text-theme-muted">
                {item.label}
              </span>
            ))}
          </nav>
          <span className="hidden text-[11px] text-theme-subtle md:inline">{brand.locationLabel}</span>
        </header>
      </EditableSection>

      {/* Hero banner */}
      <EditableSection id="banner" label="Hero Banner">
        <section className="relative flex min-h-[24rem] flex-col items-center justify-center gap-3 overflow-hidden px-5 py-14 text-center">
          {banner?.bgImage ? (
            <>
              <Image
                src={banner.bgImage}
                alt=""
                fill
                sizes="100vw"
                className="object-cover opacity-40"
                priority={false}
              />
              <span className="absolute inset-0 bg-gradient-to-b from-[#100318]/70 via-[#100318]/85 to-[#100318]" />
            </>
          ) : null}

          <div className="relative z-10 flex flex-col items-center gap-3">
            {banner?.logo ? (
              <span className="logo-chrome relative h-16 w-16 overflow-hidden rounded-full border border-studio-gold/50">
                <Image src={banner.logo} alt={brand.name} fill sizes="64px" className="object-contain p-1" />
              </span>
            ) : null}
            {banner?.badge ? <Kicker>{banner.badge}</Kicker> : null}
            <p className="font-editorial text-base italic text-theme-muted">{banner?.quote}</p>
            <h1 className="font-decorative text-[clamp(1.8rem,4vw,2.75rem)] font-bold leading-tight gold-sunset-shimmer">
              {banner?.title || brand.name}
            </h1>
            <p className="max-w-xl font-editorial text-sm text-theme-muted">{banner?.subtitle}</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2.5">
              <span className="glass-btn-gold inline-flex min-h-[42px] items-center gap-2 rounded-2xl px-6 py-2.5 text-sm font-bold text-studio-gold">
                Buy Paintings <ArrowRight className="h-4 w-4" />
              </span>
              <span className="inline-flex min-h-[42px] items-center gap-2 rounded-2xl border border-[var(--border-soft)] px-6 py-2.5 text-sm font-bold text-theme-muted">
                Explore Classes
              </span>
            </div>
          </div>
        </section>
      </EditableSection>

      {/* Featured rail */}
      <EditableSection id="featured" label="Featured Gallery">
        <section className="space-y-5 px-4 py-10 sm:px-6">
          <div className="space-y-1.5 text-center">
            <Kicker>Signature Selection</Kicker>
            <Heading>Featured Works</Heading>
            <p className="font-editorial text-sm italic text-theme-muted">
              {featured.length} {featured.length === 1 ? 'piece' : 'pieces'} in the home spotlight rail
            </p>
          </div>
          <div data-preview-interactive className="min-h-[16rem]">
            {featured.length ? (
              <Carousel3D items={featured} variant="rail" autoAdvanceIntervalMs={0} />
            ) : (
              <PreviewEmpty label="No artworks in the featured gallery yet" />
            )}
          </div>
        </section>
      </EditableSection>

      {/* Sale rail */}
      <EditableSection id="buy-paintings" label="Buy Paintings">
        <section className="space-y-5 border-y border-[var(--border-soft)] bg-black/20 px-4 py-10 sm:px-6">
          <div className="space-y-1.5 text-center">
            <Kicker>Originals Ready to Own</Kicker>
            <Heading>Buy Paintings</Heading>
            <p className="font-editorial text-sm italic text-theme-muted">
              {sale.length} {sale.length === 1 ? 'painting' : 'paintings'} listed in the sale catalogue
            </p>
          </div>
          <div data-preview-interactive className="min-h-[18rem]">
            {sale.length ? (
              <Carousel3D items={sale.slice(0, 14)} variant="spotlight" autoAdvanceIntervalMs={0} />
            ) : (
              <PreviewEmpty label="No paintings for sale yet" />
            )}
          </div>
        </section>
      </EditableSection>

      {/* About the artist */}
      <EditableSection id="aboutArtist" label="About the Artist">
        <section className="mx-auto grid max-w-5xl items-center gap-6 px-4 py-10 sm:grid-cols-[minmax(0,14rem)_1fr] sm:px-6">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[14rem] overflow-hidden rounded-3xl border border-studio-gold/30 bg-black/30">
            {aboutArtist?.portraitImage ? (
              <Image
                src={aboutArtist.portraitImage}
                alt={aboutArtist.portraitAlt || brand.founder}
                fill
                sizes="240px"
                className="object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xs text-theme-subtle">
                No portrait set
              </span>
            )}
          </div>
          <div className="space-y-2.5 text-center sm:text-left">
            <Kicker>Master Artist</Kicker>
            <h3 className="font-decorative text-section-title font-bold text-studio-gold">
              {aboutArtist?.headline || brand.founder}
            </h3>
            <p className="font-editorial text-sm italic text-theme-muted">
              {aboutArtist?.subheading || brand.subtitle}
            </p>
            <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-theme-subtle sm:justify-start">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-studio-sunset" />
                {brand.locationLabel}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-studio-sunset" />
                {brand.phoneDisplay}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-studio-sunset" />
                {brand.email}
              </span>
            </p>
          </div>
        </section>
      </EditableSection>

      {/* Courses block */}
      <EditableSection id="courses" label="Courses & Classes">
        <section className="space-y-4 border-t border-[var(--border-soft)] px-4 py-10 text-center sm:px-6">
          <Kicker>Learn at the Studio</Kicker>
          <Heading>{courses?.title || 'Courses & Classes'}</Heading>
          <p className="mx-auto max-w-2xl font-editorial text-sm italic text-theme-muted">
            {courses?.subtitle || 'Regular batches, diploma programmes and entrance coaching.'}
          </p>
          <p className="text-xs text-theme-subtle">
            {classes.length} {classes.length === 1 ? 'works' : 'works'} in the classes &amp; courses gallery
          </p>
        </section>
      </EditableSection>

      {/* Quick-nav chips */}
      <EditableSection id="quicknav" label="Quick Nav Shortcuts">
        <section className="border-t border-[var(--border-soft)] bg-black/20 px-4 py-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {quickNav.length ? (
              quickNav.map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-soft)] bg-[var(--surface-pill)] px-3.5 py-2 text-xs font-semibold text-studio-gold"
                >
                  {item.label}
                  <span className="text-[10px] font-normal text-theme-subtle">{item.href}</span>
                </span>
              ))
            ) : (
              <PreviewEmpty label="No quick-nav shortcuts configured" />
            )}
          </div>
        </section>
      </EditableSection>

      {/* Footer strip */}
      <EditableSection id="brand" label="Footer">
        <footer className="border-t border-[var(--border-soft)] px-4 py-8 sm:px-6">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 text-center">
            <span className="font-decorative text-xl font-bold gold-sunset-shimmer">{brand.name}</span>
            <p className="font-editorial text-sm italic text-theme-muted">&ldquo;{brand.tagline}&rdquo;</p>
            <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              {NAV_ITEMS.map((item) => (
                <span key={item.href} className="text-xs font-semibold text-theme-muted">
                  {item.label}
                </span>
              ))}
            </nav>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-theme-subtle">
              <span>{brand.phoneDisplay}</span>
              <span>·</span>
              <span>{brand.email}</span>
              <span>·</span>
              <span>{social?.length ?? 0} social links</span>
            </div>
            <p className="text-[11px] text-theme-subtle">
              © 2026 {brand.name}. Crafted by Abhay Kashyap.
            </p>
          </div>
        </footer>
      </EditableSection>
    </div>
  );
}

function PreviewEmpty({ label }: { label: string }) {
  return (
    <p className="flex h-full min-h-[6rem] items-center justify-center rounded-2xl border border-dashed border-studio-gold/30 bg-black/20 text-xs text-theme-subtle">
      {label}
    </p>
  );
}

function editingBadge() {
  return (
    <div className="pointer-events-none sticky top-0 z-30 flex items-center justify-center py-2">
      <span className="inline-flex items-center gap-2 rounded-full border border-studio-gold/40 bg-[#160523]/95 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-studio-gold shadow-lg backdrop-blur-md">
        <Eye className="h-3 w-3" />
        Live preview — click a block to edit
      </span>
    </div>
  );
}
