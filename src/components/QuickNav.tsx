'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Palette, Tag, Award, GraduationCap, User, Sparkles } from 'lucide-react';
import { PageListing } from '@/lib/types';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  palette: Palette,
  tag: Tag,
  award: Award,
  graduation: GraduationCap,
  user: User,
  sparkles: Sparkles,
};

function isHashTarget(href: string) {
  return href.startsWith('#');
}

/**
 * Sticky bottom quick-nav shortcuts (mobile-first).
 * • Hidden while the hero banner fills the screen, slides up as you scroll.
 * • Tracks the section currently in view and highlights its chip.
 * • 44px+ touch targets, horizontal scroll if chips overflow.
 */
export default function QuickNav({ items }: { items: PageListing[] }) {
  const [visible, setVisible] = useState(false);
  const [activeHref, setActiveHref] = useState<string>('');

  // The pill floats over the page, so it would otherwise sit on top of the
  // footer's last lines. Flag the body and let CSS reserve the room beneath.
  useEffect(() => {
    document.body.classList.add('has-quicknav');
    return () => document.body.classList.remove('has-quicknav');
  }, []);

  useEffect(() => {
    if (!items.length) return;

    const banner = document.getElementById('banner');
    const bannerObs = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0.08 }
    );
    if (banner) bannerObs.observe(banner);
    else setVisible(true);

    const hashTargets = items
      .filter((i) => isHashTarget(i.href))
      .map((i) => ({ href: i.href, el: document.getElementById(i.href.slice(1)) }))
      .filter((t): t is { href: string; el: HTMLElement } => Boolean(t.el));

    const sectionObs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const match = hashTargets.find((t) => t.el === entry.target);
            if (match) setActiveHref(match.href);
          }
        }
      },
      { rootMargin: '-35% 0px -55% 0px' }
    );
    hashTargets.forEach((t) => sectionObs.observe(t.el));

    return () => {
      bannerObs.disconnect();
      sectionObs.disconnect();
    };
  }, [items]);

  if (!items.length) return null;

  return (
    <nav
      aria-label="Page shortcuts"
      className={`fixed bottom-3 left-0 right-0 z-40 flex justify-center px-3 transition-all duration-500 ${
        visible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-[120%] opacity-0 pointer-events-none'
      }`}
    >
      <div className="quicknav-pill rounded-2xl px-2 py-1.5 max-w-[94vw] overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 w-max">
          {items.map((item) => {
            const Icon = ICONS[item.icon] || Sparkles;
            const active = activeHref === item.href;
            const inner = (
              <>
                <Icon className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">{item.label}</span>
              </>
            );
            const cls =
              'quicknav-chip inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl border text-[12px] sm:text-[13px] font-blippo font-semibold';
            return isHashTarget(item.href) ? (
              <a
                key={item.id}
                href={item.href}
                data-active={active}
                className={cls}
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById(item.href.slice(1))
                    ?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {inner}
              </a>
            ) : (
              <Link key={item.id} href={item.href} data-active={active} className={cls}>
                {inner}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
