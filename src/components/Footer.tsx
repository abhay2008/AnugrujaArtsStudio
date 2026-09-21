import Link from 'next/link';
import Image from 'next/image';
import { Phone } from 'lucide-react';
import { studioMeta } from '@/data/artData';
import Reveal from '@/components/Reveal';

const quickLinks = [
  { href: '/', label: 'Home' },
  { href: '/sale', label: 'Art for Sale' },
  { href: '/classes', label: 'Classes' },
  { href: '/about', label: 'About' },
];

/**
 * Inline brand marks for the developer credit.
 * lucide v1 ships no brand icons, so these two are hand-rolled SVGs — keeps the
 * footer dependency-free and lets them inherit `currentColor` on hover.
 */
function GithubMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12.02c0 5.09 3.29 9.4 7.86 10.92.57.11.78-.25.78-.55v-1.93c-3.2.7-3.88-1.54-3.88-1.54-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.78 2.7 1.27 3.36.97.1-.75.4-1.27.73-1.56-2.56-.29-5.25-1.29-5.25-5.74 0-1.27.45-2.3 1.19-3.12-.12-.29-.52-1.47.11-3.06 0 0 .96-.31 3.15 1.19a10.9 10.9 0 0 1 5.74 0c2.19-1.5 3.15-1.19 3.15-1.19.63 1.59.23 2.77.12 3.06.74.82 1.19 1.85 1.19 3.12 0 4.46-2.7 5.44-5.27 5.73.41.36.78 1.07.78 2.16v3.2c0 .31.2.67.79.55A11.51 11.51 0 0 0 23.5 12.02C23.5 5.66 18.35.5 12 .5Z" />
    </svg>
  );
}

function LinkedinMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.26 2.37 4.26 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14Zm1.78 13.02H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="site-footer w-full py-12 px-4 border-t border-[var(--border-soft)] relative overflow-hidden">
      {/* Subtle sunset ambient glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-studio-sunset/10 blur-[80px] pointer-events-none" />

      <Reveal className="max-w-4xl mx-auto flex flex-col items-center gap-5 text-center relative z-10">
        {/* Mini logo + name */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="logo-chrome relative w-11 h-11 rounded-full overflow-hidden border group-hover:border-studio-sunset transition-colors">
            <Image
              src="/images/logo.png"
              alt="Anugruja Arts Studio"
              fill
              sizes="44px"
              className="object-contain p-1"
            />
          </div>
          <span className="font-decorative font-bold text-xl gold-sunset-shimmer tracking-wider">
            {studioMeta.name}
          </span>
        </Link>

        <p className="font-editorial italic text-theme-muted text-base md:text-lg">
          &ldquo;{studioMeta.tagline}&rdquo;
        </p>

        {/* Quick links with 44px touch targets */}
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="nav-link touch-target px-3 min-h-[44px] text-theme-muted hover:text-studio-sunset text-sm font-blippo transition-colors"
            >
              {link.label}
            </Link>
          ))}
          {/* Replay Intro button for motion graphics preview */}
          <Link
            href="/?intro=true"
            className="touch-target px-3 min-h-[44px] text-studio-sunset/90 hover:text-studio-gold text-xs font-blippo uppercase tracking-wider flex items-center gap-1.5 transition-colors"
          >
            <span>▶ Replay Intro</span>
          </Link>
        </nav>

        <div className="h-px w-48 bg-gradient-to-r from-transparent via-studio-gold/40 to-transparent" />

        {/* Developer credit — the "want a site like this?" note for the studio's
            visitors. Deliberately separate from the studio's own contact block:
            this phone number and these links belong to the developer. */}
        <div className="dev-credit w-full max-w-xl rounded-2xl px-5 py-5 sm:px-7 sm:py-6 flex flex-col items-center gap-3.5">
          <p className="font-blippo text-xs sm:text-[11px] uppercase tracking-[0.18em] sm:tracking-[0.24em] text-studio-gold/85">
            Website design &amp; development
          </p>

          <p className="font-serif-display text-[15px] sm:text-lg leading-snug text-theme-primary">
            {studioMeta.developerRole}:{' '}
            <a
              href={studioMeta.developerGithub}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold gold-sunset-shimmer underline decoration-studio-gold/40 underline-offset-4 hover:decoration-studio-sunset transition-colors"
            >
              {studioMeta.developerName}
            </a>{' '}
            <span className="whitespace-nowrap text-theme-muted">
              ({studioMeta.developerAffiliation})
            </span>
          </p>

          <p className="font-editorial italic text-[0.84rem] sm:text-sm text-theme-subtle max-w-sm">
            Want a website like this for your own studio or business? Get in touch.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <a
              href={studioMeta.developerPhoneHref}
              className="dev-credit-btn"
              aria-label={`Call ${studioMeta.developerName} on ${studioMeta.developerPhone}`}
            >
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="tabular-nums">{studioMeta.developerPhone}</span>
            </a>
            <a
              href={studioMeta.developerGithub}
              target="_blank"
              rel="noopener noreferrer"
              className="dev-credit-btn"
              aria-label={`${studioMeta.developerName} on GitHub`}
            >
              <GithubMark className="h-4 w-4" />
              <span>GitHub</span>
            </a>
            <a
              href={studioMeta.developerLinkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="dev-credit-btn"
              aria-label={`${studioMeta.developerName} on LinkedIn`}
            >
              <LinkedinMark className="h-3.5 w-3.5" />
              <span>LinkedIn</span>
            </a>
          </div>
        </div>

        <p className="font-serif-display text-theme-subtle text-[0.84rem] sm:text-sm">
          &copy; {new Date().getFullYear()} {studioMeta.name}. All rights reserved.
        </p>
      </Reveal>
    </footer>
  );
}
