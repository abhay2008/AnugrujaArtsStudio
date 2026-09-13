import Link from 'next/link';
import Image from 'next/image';
import { studioMeta } from '@/data/artData';
import Reveal from '@/components/Reveal';

const quickLinks = [
  { href: '/', label: 'Home' },
  { href: '/sale', label: 'Art for Sale' },
  { href: '/classes', label: 'Classes' },
  { href: '/about', label: 'About' },
];

export default function Footer() {
  return (
    <footer className="w-full py-12 px-4 border-t border-studio-gold/25 bg-gradient-to-b from-[#0e0216] to-[#08010d] relative overflow-hidden">
      {/* Subtle sunset ambient glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-studio-sunset/10 blur-[80px] pointer-events-none" />

      <Reveal className="max-w-4xl mx-auto flex flex-col items-center gap-5 text-center relative z-10">
        {/* Mini logo + name */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-11 h-11 rounded-full overflow-hidden border border-studio-gold/60 group-hover:border-studio-sunset transition-colors shadow-[0_0_15px_rgba(242,215,112,0.25)]">
            <Image
              src="/images/logo.png"
              alt="Anugraha Arts Studio"
              fill
              sizes="44px"
              className="object-contain p-1"
            />
          </div>
          <span className="font-decorative font-bold text-xl gold-sunset-shimmer tracking-wider">
            {studioMeta.name}
          </span>
        </Link>

        <p className="font-editorial italic text-amber-100/70 text-base md:text-lg">
          &ldquo;{studioMeta.tagline}&rdquo;
        </p>

        {/* Quick links with 44px touch targets */}
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="nav-link touch-target px-3 min-h-[44px] text-amber-100/80 hover:text-studio-sunset text-sm font-blippo transition-colors"
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

        <p className="font-serif-display text-yellow-100/60 text-xs sm:text-sm">
          &copy; {new Date().getFullYear()} {studioMeta.name}. All rights reserved.
        </p>
        <p className="font-serif-display text-sm font-medium text-amber-200/80">
          Crafted with artistic devotion for Master Artist Anuradha &bull;{' '}
          <a
            href={studioMeta.developerGithub}
            target="_blank"
            rel="noopener noreferrer"
            className="text-studio-gold hover:text-studio-sunset underline underline-offset-4 transition-colors"
          >
            {studioMeta.developerName}
          </a>
        </p>
      </Reveal>
    </footer>
  );
}
