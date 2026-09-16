'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown, X } from 'lucide-react';
import { studioMeta } from '@/data/artData';
import ThemeToggle from '@/components/ThemeToggle';
import { useScrollLock } from '@/lib/scrollLock';

type SocialNetwork = 'whatsapp' | 'facebook' | 'instagram' | 'youtube';

const SOCIAL_PATHS: Record<SocialNetwork, string> = {
  whatsapp:
    'M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z',
  facebook:
    'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  instagram:
    'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
  youtube:
    'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
};

const SOCIAL_LINKS: { network: SocialNetwork; title: string; href: string }[] = [
  { network: 'whatsapp', title: 'WhatsApp', href: studioMeta.whatsappUrl },
  { network: 'facebook', title: 'Facebook', href: studioMeta.facebookUrl },
  { network: 'instagram', title: 'Instagram', href: studioMeta.instagramUrl },
  { network: 'youtube', title: 'YouTube', href: studioMeta.youtubeUrl },
];

/** Two most-used channels stay in the mobile bar — the rest live in the drawer. */
const QUICK_SOCIALS: SocialNetwork[] = ['whatsapp', 'instagram'];

const PRODUCT_LINKS = [
  { href: '/sale', label: 'Art for sale' },
  { href: '/#workshops', label: 'Workshops & Events' },
  { href: '/sale#commission', label: 'Commissioned artwork' },
  { href: '/classes', label: 'Courses & Classes', top: true },
  { href: '/classes#online', label: 'Online-Offline Classes', sub: true },
  { href: '/classes#water', label: 'Watercolour Courses', sub: true },
  { href: '/classes#short', label: 'Short Term Courses', sub: true },
];

const DRAWER_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/sale', label: 'Art for Sale' },
  { href: '/classes', label: 'Courses & Classes' },
  { href: '/#workshops', label: 'Workshops & Events' },
  { href: '/sale#commission', label: 'Commissioned Artwork' },
  { href: '/about', label: 'About the Studio' },
  { href: '/#achievements', label: 'Achievements' },
];

function SocialIcon({ network }: { network: SocialNetwork }) {
  return (
    <svg
      className="h-[18px] w-[18px] fill-current"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d={SOCIAL_PATHS[network]} />
    </svg>
  );
}

/** Three lines that morph into an X while the drawer is open. */
function BurgerGlyph({ open }: { open: boolean }) {
  return (
    <span className="relative block h-[18px] w-[22px]" aria-hidden="true">
      <span
        className={`absolute left-0 h-[2px] w-full rounded-full bg-current transition-all duration-300 ${
          open ? 'top-1/2 -translate-y-1/2 rotate-45' : 'top-0'
        }`}
      />
      <span
        className={`absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 rounded-full bg-current transition-all duration-300 ${
          open ? 'scale-x-0 opacity-0' : ''
        }`}
      />
      <span
        className={`absolute left-0 h-[2px] w-full rounded-full bg-current transition-all duration-300 ${
          open ? 'bottom-1/2 translate-y-1/2 -rotate-45' : 'bottom-0'
        }`}
      />
    </span>
  );
}

export default function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setDrawerOpen(false);
    setDropdownOpen(false);
  }, [pathname]);

  useScrollLock(drawerOpen);

  // Escape closes the drawer.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen]);

  return (
    <>
      <header className="gallery-header sticky top-0 left-0 z-40 w-full">
        <div className="gallery-header-bar flex min-h-[4.5em] items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6 lg:grid lg:grid-cols-[auto_1fr_auto] lg:gap-4 lg:px-8 xl:gap-6">
          {/* ── Zone 1 · crest + brand name ── */}
          <Link
            href="/"
            aria-label={`${studioMeta.founder} — home`}
            className="flex shrink-0 items-center gap-1.5 sm:gap-3"
          >
            <span className="logo-chrome relative h-8 w-8 shrink-0 overflow-hidden rounded-full border sm:h-10 sm:w-10">
              <Image src="/images/logo.png" alt="" fill sizes="40px" className="object-contain p-1" />
            </span>
            <span className="site-brand-title font-decorative font-bold text-gallery-gold">
              {studioMeta.founder}
            </span>
          </Link>

          {/* ── Zone 2 · desktop navigation ── */}
          <nav aria-label="Primary" className="hidden items-center justify-center gap-4 lg:flex xl:gap-7">
            <Link href="/" className="gallery-nav-link">
              Home
            </Link>

            <div
              className="relative"
              onMouseEnter={() => setDropdownOpen(true)}
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                className="gallery-nav-link inline-flex items-center gap-1"
              >
                Products &amp; Services
                <ChevronDown
                  className={`h-[18px] w-[18px] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {dropdownOpen && (
                <div className="glass-panel-sunset absolute right-0 top-full z-50 mt-2 flex w-64 flex-col rounded-2xl border border-studio-gold/25 py-2.5 shadow-2xl">
                  {PRODUCT_LINKS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`gallery-nav-dropdown ${item.sub ? 'pl-9 text-xs' : ''} ${
                        item.top ? 'mt-1 border-t border-purple-800/40 pt-2.5' : ''
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link href="/about" className="gallery-nav-link">
              About Us
            </Link>

            <Link href="/#achievements" className="gallery-nav-link">
              Achievements
            </Link>
          </nav>

          {/* ── Zone 3 · actions ── */}
          <div className="flex shrink-0 items-center justify-end gap-2.5">
            {/* Desktop: Theme Toggle */}
            <div className="hidden lg:flex items-center">
              <ThemeToggle />
            </div>

            {/* Desktop: full social pill */}
            <div
              className="header-social-strip hidden items-center gap-0.5 rounded-full p-1 lg:flex"
              aria-label="Social media"
            >
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.title}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={social.title}
                  className="header-social-btn flex h-8 w-8 items-center justify-center rounded-full"
                >
                  <span className="sr-only">{social.title}</span>
                  <SocialIcon network={social.network} />
                </a>
              ))}
            </div>

            {/* Mobile / tablet: one unified glass cluster */}
            <div className="header-mobile-cluster flex items-center gap-0.5 rounded-full p-1 lg:hidden">
              {QUICK_SOCIALS.map((network) => {
                const social = SOCIAL_LINKS.find((s) => s.network === network)!;
                return (
                  <a
                    key={social.title}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={social.title}
                    className="header-social-btn flex h-7 w-7 items-center justify-center rounded-full"
                  >
                    <span className="sr-only">{social.title}</span>
                    <SocialIcon network={social.network} />
                  </a>
                );
              })}

              <ThemeToggle compact />

              <button
                type="button"
                onClick={() => setDrawerOpen((open) => !open)}
                aria-label={drawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={drawerOpen}
                aria-controls="site-navigation-drawer"
                className="header-icon-btn flex h-9 w-9 items-center justify-center rounded-xl border transition-all active:scale-95"
              >
                <BurgerGlyph open={drawerOpen} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Scrim — fades in behind the drawer */}
      <div
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-[45] bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          drawerOpen ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
      />

      {/* Off-canvas drawer — slides in from the right edge */}
      <aside
        id="site-navigation-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`header-drawer fixed inset-y-0 right-0 z-50 flex w-[82vw] max-w-[360px] flex-col overflow-y-auto border-l border-[#d4af37]/25 transition-transform duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          drawerOpen ? 'visible translate-x-0' : 'invisible translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-[#d4af37]/20 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="logo-chrome relative h-9 w-9 shrink-0 overflow-hidden rounded-full border">
              <Image src="/images/logo.png" alt="" fill sizes="36px" className="object-contain p-1" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-decorative text-[13px] font-bold tracking-wide text-[#e5c158]">
                Anugruja Arts Studio
              </span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-[var(--text-subtle)]">
                {studioMeta.locationLabel}
              </span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation menu"
            className="header-icon-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all active:scale-95"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        </div>

        {/* Nav links — staggered entrance */}
        <nav aria-label="Mobile" className="flex flex-col px-5 py-2">
          {DRAWER_LINKS.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setDrawerOpen(false)}
              style={{ transitionDelay: drawerOpen ? `${90 + i * 50}ms` : '0ms' }}
              className={`drawer-nav-link font-serif-display block py-3 text-lg tracking-wide text-[var(--text-primary)] ${
                drawerOpen ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Social tray + direct action, anchored to the base */}
        <div className="mt-auto px-5 pb-6 pt-5">
          <p className="section-kicker mb-3 text-[10px] text-[var(--text-subtle)]">Connect</p>
          <div className="flex flex-wrap gap-2">
            {SOCIAL_LINKS.map((social, i) => (
              <a
                key={social.title}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ transitionDelay: drawerOpen ? `${180 + i * 50}ms` : '0ms' }}
                className={`header-social-pill inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-all duration-500 ${
                  drawerOpen ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'
                }`}
              >
                <SocialIcon network={social.network} />
                <span>{social.title}</span>
              </a>
            ))}
          </div>

          <a
            href={studioMeta.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="glass-btn-sunset mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 font-bold text-white shadow-xl active:scale-95"
          >
            <span>Inquire on WhatsApp</span>
          </a>
        </div>
      </aside>
    </>
  );
}
