import Link from 'next/link';
import Image from 'next/image';
import AnimeHeroGraphics from '@/components/AnimeHeroGraphics';
import InteractiveSlideshow from '@/components/InteractiveSlideshow';
import AutoScroller from '@/components/AutoScroller';
import ContactActionButtons from '@/components/ContactActionButtons';
import Reveal from '@/components/Reveal';
import {
  featuredGallery,
  workshopGallery,
  testimonialGallery,
  studioMeta,
} from '@/data/artData';
import { ChevronDown, Sparkles, ExternalLink, Palette, Award, HeartHandshake } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col w-full overflow-x-hidden">
      {/* 1. Hero Banner with motion graphic & logo */}
      <section
        id="banner"
        className="relative min-h-[88vh] flex items-center justify-center py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-cover bg-center bg-no-repeat overflow-hidden"
        style={{ backgroundImage: "url('/images/banner.jpeg')" }}
      >
        {/* Dark overlay with royal purple and warm sunset vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#180424]/90 via-[#100318]/80 to-[#100318]" />
        {/* Ambient warm sunset radial illumination */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[350px] bg-gradient-to-r from-studio-sunset/10 via-purple-600/15 to-studio-gold/10 blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-10 text-center md:text-left">
          {/* Hero text — staggered entrance */}
          <div className="flex-1 space-y-5 max-w-xl">
            <div
              className="hero-rise inline-flex items-center gap-2 px-4 py-2 rounded-full glass-pill text-amber-200 text-xs sm:text-sm font-medium"
              style={{ animationDelay: '0.05s' }}
            >
              <Sparkles className="w-4 h-4 text-studio-sunset animate-pulse" />
              <span className="tracking-wide">Fine Arts Studio &amp; Master Academy</span>
            </div>

            <h1
              className="hero-rise font-decorative text-4xl sm:text-6xl lg:text-7xl font-bold gold-sunset-shimmer tracking-wider leading-tight drop-shadow-[0_4px_25px_rgba(0,0,0,0.9)]"
              style={{ animationDelay: '0.15s' }}
            >
              Anugraha Arts Studio
            </h1>

            <h2
              className="hero-rise font-blippo text-xl sm:text-3xl lg:text-4xl font-semibold text-studio-gold tracking-wide drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]"
              style={{ animationDelay: '0.28s' }}
            >
              Learn and buy art!
            </h2>

            <p
              className="hero-rise font-editorial italic text-lg sm:text-2xl text-amber-100/90 tracking-wide"
              style={{ animationDelay: '0.4s' }}
            >
              &ldquo;Discover ourselves through colors&rdquo;
            </p>

            <div
              className="hero-rise flex flex-col sm:flex-row items-stretch sm:items-center justify-center md:justify-start gap-4 pt-4"
              style={{ animationDelay: '0.52s' }}
            >
              <Link
                href="/sale"
                className="glass-btn-sunset min-h-[48px] px-8 py-3.5 rounded-2xl text-white font-bold text-lg text-center flex items-center justify-center gap-2 active:scale-95"
              >
                <Palette className="w-5 h-5 text-amber-200" />
                <span>Art for Sale!</span>
              </Link>
              <Link
                href="/classes"
                className="glass-btn-gold min-h-[48px] px-8 py-3.5 rounded-2xl text-studio-gold font-bold text-lg text-center flex items-center justify-center gap-2 active:scale-95"
              >
                <Award className="w-5 h-5 text-studio-sunset" />
                <span>Explore Classes</span>
              </Link>
            </div>
          </div>

          {/* Hero Motion Graphic and Studio Logo */}
          <div className="relative flex items-center justify-center">
            <AnimeHeroGraphics />
            <div className="hero-zoom absolute inset-0 flex items-center justify-center" style={{ animationDelay: '0.3s' }}>
              <div className="relative w-36 h-36 sm:w-48 sm:h-48 md:w-56 md:h-56 rounded-full overflow-hidden border-2 border-studio-gold/80 shadow-[0_0_45px_rgba(242,215,112,0.45)] bg-black/50 animate-float backdrop-blur-sm">
                <Image
                  src="/images/logo.png"
                  alt="Anugraha Arts Studio Logo"
                  fill
                  priority
                  fetchPriority="high"
                  className="object-contain p-2 sm:p-3"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Scroll down indicator */}
        <a
          href="#one"
          aria-label="Scroll to next section"
          className="hero-rise absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 touch-target p-2.5 rounded-full glass-pill text-studio-gold hover:text-white hover:scale-110 active:scale-95 transition-all animate-bounce"
          style={{ animationDelay: '0.7s' }}
        >
          <ChevronDown className="w-5 h-5 text-studio-gold" />
        </a>
      </section>

      {/* 2. Spotlight Section One: Art Gallery Featured Collection */}
      <section id="one" className="py-20 px-4 sm:px-6 max-w-6xl mx-auto w-full space-y-10">
        <Reveal className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-pill text-xs text-studio-sunset mb-1">
            <Palette className="w-3.5 h-3.5" />
            <span>Curated Masterworks</span>
          </div>
          <h2 className="font-decorative text-3xl sm:text-5xl lg:text-6xl text-studio-gold font-bold tracking-wide">
            Art Gallery
          </h2>
          <p className="font-editorial text-xl sm:text-3xl text-amber-200/90 italic">
            Take a look at our artworks
          </p>
          <p className="max-w-2xl mx-auto font-serif-display text-yellow-100/80 text-base sm:text-lg leading-relaxed">
            We have art done in watercolours and other mediums too! We have realistic art, floral
            art, nature art, landscape art, and more handcrafted fine arts collections.
          </p>
        </Reveal>

        {/* Interactive Slideshow with 27 Featured Works in a frosted glass frame */}
        <Reveal delay={120}>
          <div className="glass-panel rounded-3xl p-3 sm:p-6 shadow-2xl">
            <InteractiveSlideshow items={featuredGallery} />
          </div>
        </Reveal>

        <Reveal className="text-center pt-4" delay={180}>
          <Link
            href="/sale"
            className="glass-btn-sunset inline-flex items-center justify-center gap-2 min-h-[48px] px-10 py-4 rounded-2xl text-white font-bold text-lg sm:text-xl active:scale-95 shadow-xl"
          >
            <span>Browse Art for sale</span>
            <ExternalLink className="w-5 h-5 text-amber-200" />
          </Link>
        </Reveal>
      </section>

      <hr className="border-t border-studio-gold/20 max-w-5xl mx-auto w-full" />

      {/* 3. Spotlight Section Two: Workshops & World-Class Exhibitions */}
      <section id="two" className="py-20 px-4 sm:px-6 max-w-6xl mx-auto w-full space-y-10">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10">
          <Reveal variant="left" className="flex-1 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-pill text-xs text-amber-300">
              <Award className="w-3.5 h-3.5 text-studio-sunset" />
              <span>Global Honors &amp; Masterclasses</span>
            </div>

            <h2 className="font-decorative text-3xl sm:text-5xl text-studio-gold font-bold">
              Workshops &amp; Exhibitions
            </h2>
            <p className="font-editorial text-xl sm:text-2xl text-amber-100/95 leading-relaxed">
              Master Artist Anuradha Govarthanan has led numerous prestigious workshops and exhibited in world-class art showcases.
            </p>

            {/* Bulleted achievements with verified historical events in glass card */}
            <div className="glass-card rounded-2xl p-5 sm:p-6 border border-white/10 space-y-3">
              <ul className="space-y-3 text-left font-serif-display text-sm sm:text-base text-yellow-100/90">
                {[
                  'Corporate workshop in MNC Hyderabad and Bangalore on Theme Global Warming.',
                  'Art exhibition in State Art Gallery on the theme Ganesha 2023.',
                  'Exhibited artwork for Telangana Formation Day 2021.',
                  'Exhibition in State Art Gallery by Hyderabad Art Festival 2023.',
                  'Golden Award in international art competition organised by Shiny Colours Bangalore.',
                  'Art workshop as a part of foreign exchange program in University of Hyderabad 2019.',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-studio-sunset text-base mt-0.5">•</span>
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-2">
              <a
                href={studioMeta.eventsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-btn-gold inline-flex items-center gap-2 min-h-[48px] px-8 py-3.5 rounded-2xl text-studio-gold font-bold text-base sm:text-lg active:scale-95"
              >
                <span>New events &amp; masterclasses</span>
                <ExternalLink className="w-4 h-4 text-studio-sunset" />
              </a>
            </div>
          </Reveal>

          {/* Scroller for Workshops with glass container */}
          <Reveal variant="right" className="w-full md:w-1/2" delay={150}>
            <div className="glass-panel rounded-3xl p-3 sm:p-5 shadow-2xl">
              <AutoScroller items={workshopGallery} itemHeight="h-72" />
            </div>
          </Reveal>
        </div>
      </section>

      <hr className="border-t border-studio-gold/20 max-w-5xl mx-auto w-full" />

      {/* 4. Spotlight Section Three: Testimonies & Student Success */}
      <section id="three" className="py-20 px-4 sm:px-6 max-w-6xl mx-auto w-full space-y-8">
        <Reveal className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-pill text-xs text-studio-sunset mb-1">
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Community &amp; Mentorship</span>
          </div>
          <h2 className="font-decorative text-3xl sm:text-5xl text-studio-gold font-bold">
            Testimonies
          </h2>
          <p className="font-editorial text-lg sm:text-2xl text-amber-100/90 italic">
            The students are very happy with the results that they have gotten through Anugraha Art School.
          </p>
        </Reveal>

        {/* Student Testimonial Artwork Scroller */}
        <Reveal delay={100}>
          <div className="glass-panel rounded-3xl p-3 sm:p-5 shadow-2xl">
            <AutoScroller items={testimonialGallery} itemHeight="h-64" />
          </div>
        </Reveal>

        {/* Highlighted Quote Block with Sunset Glassmorphism */}
        <Reveal delay={150}>
          <div className="glass-panel-sunset max-w-4xl mx-auto p-6 sm:p-10 rounded-3xl relative overflow-hidden shadow-2xl">
            <span className="absolute -top-4 left-6 text-7xl sm:text-8xl text-studio-sunset/20 font-serif-display leading-none select-none pointer-events-none">
              &ldquo;
            </span>
            <p className="relative z-10 font-editorial text-base sm:text-xl text-yellow-50/95 leading-relaxed text-justify sm:text-left italic">
              Under Teacher Anuradha&apos;s tutelage for three years, I&apos;ve grown through group
              sessions, diverse workshops, and private classes. Her unparalleled expertise fosters a
              supportive learning environment, offering constructive criticism and encouragement.
              Private sessions notably enhanced my skills, pushing boundaries with newfound mediums
              like charcoal and watercolor, even conquering portrait art. Anuradha&apos;s guidance
              transformed my artistic abilities, making her classes a must for artists of any level,
              promising novel skills from the best teacher.
            </p>
          </div>
        </Reveal>
      </section>

      {/* 5. Direct Contact Action Bridge */}
      <section className="py-12 px-4 text-center">
        <Reveal>
          <h3 className="font-decorative text-2xl sm:text-3xl gold-sunset-shimmer mb-2">
            Get in Touch with Master Artist Anuradha
          </h3>
          <p className="font-serif-display text-amber-100/80 text-sm sm:text-base mb-6">
            Direct inquiries for painting sales, workshops, or custom commissions
          </p>
          <ContactActionButtons />
        </Reveal>
      </section>
    </div>
  );
}
