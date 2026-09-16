import Link from 'next/link';
import { ChevronDown, Ribbon, ShoppingBag } from 'lucide-react';
import HeroEmblem from '@/components/HeroEmblem';
import BotanicalCorner from '@/components/BotanicalCorner';
import AtelierMotion from '@/components/AtelierMotion';
import { studioData } from '@/data/studioData';
import initialContent from '../../content/site.json';
import type { SiteContent } from '@/lib/types';

/**
 * The banner spotlight mirrors the next CMS event when one exists, so the
 * home page and the chat assistant can never disagree about what's coming.
 * Falls back to the editorial spotlight in studioData otherwise.
 */
function SpotlightBar() {
  const { spotlight } = studioData;
  const events = (initialContent as unknown as SiteContent).events?.upcoming ?? [];
  const next = events[0];

  const category = next ? 'Upcoming Workshop' : spotlight.category;
  const headline = next?.title ?? spotlight.headline;
  const dateBadge = next?.date ?? spotlight.dateBadge;
  // The landing-page announcement should guide visitors to the full event
  // details and registration cards, not skip straight to the external form.
  const href = next ? '#workshops' : spotlight.actionUrl;
  const seats = next?.seatsRemaining ?? spotlight.seatsRemaining;
  const seatsNote = seats ? `${seats} seats left` : null;

  if (!next && !spotlight.isActive) return null;

  return (
    <div className="spotlight-bar-container hero-rise" style={{ animationDelay: '0.06s' }}>
      <Link href={href} className="spotlight-pill">
        <span className="pulsing-status-dot" aria-hidden />
        <span className="spotlight-cat">{category}</span>
        <span className="spotlight-title">{headline}</span>
        <span className="spotlight-date">{dateBadge}</span>
        {seatsNote && <span className="spotlight-seats">{seatsNote}</span>}
        <span className="spotlight-arrow" aria-hidden>↗</span>
      </Link>
    </div>
  );
}

function AtelierDefs() {
  return (
    <svg width="0" height="0" className="atelier-svg-defs" aria-hidden="true" focusable="false">
      <defs>
        <filter id="atelierNoise">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise" />
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.18 0" />
        </filter>
        <linearGradient id="goldLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--leaf-gold-1)" />
          <stop offset="25%" stopColor="var(--leaf-gold-2)" />
          <stop offset="60%" stopColor="var(--leaf-gold-3)" />
          <stop offset="85%" stopColor="var(--leaf-gold-4)" />
          <stop offset="100%" stopColor="var(--leaf-gold-5)" />
        </linearGradient>
        <linearGradient id="goldStemGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--leaf-gold-stem-1)" />
          <stop offset="50%" stopColor="var(--leaf-gold-stem-2)" />
          <stop offset="100%" stopColor="var(--leaf-gold-stem-3)" />
        </linearGradient>
        <linearGradient id="purpleLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--leaf-violet-1)" />
          <stop offset="35%" stopColor="var(--leaf-violet-2)" />
          <stop offset="70%" stopColor="var(--leaf-violet-3)" />
          <stop offset="100%" stopColor="var(--leaf-violet-4)" />
        </linearGradient>
        <linearGradient id="purpleStemGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--leaf-violet-stem-1)" />
          <stop offset="50%" stopColor="var(--leaf-violet-stem-2)" />
          <stop offset="100%" stopColor="var(--leaf-violet-stem-3)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Slow, blurred foil petals drifting through the hero air — barely there. */
const PETALS = [
  { x: '6%', size: 190, dur: 31, delay: -4, tone: 'gold' },
  { x: '22%', size: 140, dur: 38, delay: -19, tone: 'violet' },
  { x: '47%', size: 220, dur: 44, delay: -9, tone: 'violet' },
  { x: '68%', size: 160, dur: 35, delay: -27, tone: 'gold' },
  { x: '86%', size: 200, dur: 41, delay: -14, tone: 'gold' },
  { x: '34%', size: 120, dur: 28, delay: -23, tone: 'violet' },
] as const;

function FoilPetals() {
  return (
    <div className="foil-petal-field" aria-hidden>
      {PETALS.map((p, i) => (
        <span
          key={`petal-${i}`}
          className={`foil-petal foil-petal-${p.tone}`}
          style={{
            left: p.x,
            width: p.size,
            height: p.size * 0.42,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/** Atmospheric editorial hero: CMS-ready spotlight, crest, and studio pillars. */
export default function LandingHero() {
  const { hero } = studioData;

  return (
    <div className="relative w-full flex flex-col">
      <SpotlightBar />

      <section id="banner" className="atelier-hero-viewport landing-hero">
        <AtelierDefs />
        <div className="procedural-grain-layer" aria-hidden />
        <div className="atelier-gold-frame" aria-hidden />
        <div className="ambient-dust-field" id="dustField" aria-hidden />
        <FoilPetals />

        <BotanicalCorner tone="gold" branch="primary" className="corner-tl" />
        <BotanicalCorner tone="violet" branch="secondary" className="corner-bl" />
        <BotanicalCorner tone="violet" branch="secondary" className="corner-tr" />
        <BotanicalCorner tone="gold" branch="primary" className="corner-br" />

        <div className="atelier-hero-content">
          <div className="atelier-hero-grid hero-rise" style={{ animationDelay: '0.12s' }}>
          <div className="hero-text-col">
            <span className="atelier-overline">
              {hero.overline}
            </span>
            <h1 className="atelier-brand-title">
              {hero.title}
            </h1>
            <p className="atelier-subtitle">
              {hero.subtitle}
            </p>
            <blockquote className="atelier-quote">
              “{hero.mantra}”
            </blockquote>

            <div className="hero-cta-cluster">
              <Link href="#buy-paintings" className="btn-atelier-outline">
                <ShoppingBag className="btn-icon" size={18} aria-hidden />
                <span>Buy Paintings</span>
              </Link>
              <Link href="/classes" className="btn-atelier-solid">
                <Ribbon className="btn-icon" size={18} aria-hidden />
                <span>Explore Classes</span>
              </Link>
            </div>
          </div>

          <div className="hero-crest-col">
            <HeroEmblem size="lg" />
          </div>
        </div>

        <div id="classes" className="studio-pillars-grid" aria-label="Studio offerings">
          {studioData.pillars.map((pillar) => (
            <Link
              href={pillar.url}
              className="studio-pillar-card"
              key={pillar.id}
            >
              <div>
                <span className="studio-pillar-tag">{pillar.tag}</span>
                <h2>{pillar.title}</h2>
                <p>{pillar.description}</p>
              </div>
              <span className="studio-pillar-arrow" aria-hidden>↗</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="scroll-down-affordance">
        <a href="#buy-paintings" aria-label="Scroll to collection" className="chevron-circle">
          <ChevronDown size={18} aria-hidden />
        </a>
      </div>
        <AtelierMotion />
      </section>
    </div>
  );
}
