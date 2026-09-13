import Link from 'next/link';
import Image from 'next/image';
import AnimeHeroGraphics from '@/components/AnimeHeroGraphics';
import InteractiveSlideshow from '@/components/InteractiveSlideshow';
import AutoScroller from '@/components/AutoScroller';
import ContactActionButtons from '@/components/ContactActionButtons';
import {
  featuredGallery,
  workshopGallery,
  testimonialGallery,
  studioMeta,
} from '@/data/artData';
import { ChevronDown, Sparkles, Award, Palette, ExternalLink } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* 1. Hero Banner with animejs motion graphic & logo */}
      <section
        id="banner"
        className="relative min-h-[85vh] flex items-center justify-center py-16 px-4 bg-cover bg-center bg-no-repeat overflow-hidden"
        style={{ backgroundImage: "url('/images/banner.jpeg')" }}
      >
        {/* Dark overlay with purple-gold vignette for high contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#190626]/85 via-[#100318]/75 to-[#100318]" />

        <div className="relative z-10 max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          {/* Hero text */}
          <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-studio-purple/60 border border-studio-gold/50 text-studio-gold text-sm font-medium backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-studio-gold animate-pulse" />
              <span>Fine Arts Studio &amp; Master Academy</span>
            </div>

            <h1 className="font-blippo text-5xl md:text-7xl font-extrabold text-[#F2F5A4] tracking-wide leading-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
              Anugruja Arts Studio
            </h1>

            <h2 className="font-blippo text-2xl md:text-4xl font-bold text-[#F2D770] tracking-wide drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              Learn and buy art!
            </h2>

            <p className="font-luminari text-lg md:text-xl text-[#ffe76c] opacity-90 italic">
              &quot;Discover ourselves through colors&quot;
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-4">
              <Link
                href="/sale"
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#370e55] to-purple-900 border-2 border-purple-300 text-studio-gold font-bold text-lg hover:border-yellow-300 hover:scale-105 transition-all shadow-[0_0_20px_rgba(242,215,112,0.3)]"
              >
                Art for Sale!
              </Link>
              <Link
                href="/classes"
                className="px-8 py-3.5 rounded-2xl bg-[#1d082c]/80 border-2 border-studio-gold/60 text-[#ffe76c] font-bold text-lg hover:bg-studio-purple/80 hover:scale-105 transition-all"
              >
                Explore Classes
              </Link>
            </div>
          </div>

          {/* Hero Motion Graphic and Studio Logo */}
          <div className="relative flex items-center justify-center">
            <AnimeHeroGraphics />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-40 h-40 md:w-52 md:h-52 rounded-full overflow-hidden border-2 border-studio-gold/80 shadow-[0_0_40px_rgba(242,215,112,0.5)] bg-black/40">
                <Image
                  src="/images/logo.png"
                  alt="Anugruja Arts Studio Logo"
                  fill
                  priority
                  className="object-contain p-2"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Scroll down indicator */}
        <a
          href="#one"
          aria-label="Scroll to next section"
          className="absolute bottom-6 left-1/2 -translate-x-1/2 p-2 rounded-full bg-studio-purple/60 border border-studio-gold/40 text-studio-gold hover:text-white hover:scale-110 transition-all animate-bounce"
        >
          <ChevronDown className="w-6 h-6" />
        </a>
      </section>

      {/* 2. Spotlight Section One: Art Gallery Featured Collection */}
      <section id="one" className="py-20 px-4 max-w-6xl mx-auto w-full space-y-10">
        <div className="text-center space-y-3">
          <h2 className="font-luminari text-3xl md:text-5xl text-[#f0df2a] font-normal tracking-wide">
            Art Gallery
          </h2>
          <p className="font-luminari text-xl md:text-2xl text-[#d1a515]">
            Take a look at our artworks
          </p>
          <p className="max-w-2xl mx-auto text-yellow-100/80 text-base md:text-lg">
            We have art done in watercolours and other mediums too! We have realistic art, floral
            art, nature art, landscape art, and more handcrafted fine arts collections.
          </p>
        </div>

        {/* Interactive InteractiveSlideshow with 27 Featured Works */}
        <InteractiveSlideshow items={featuredGallery} />

        <div className="text-center pt-4">
          <Link
            href="/sale"
            className="inline-block px-10 py-4 rounded-2xl bg-[#370e55] border-2 border-purple-300 text-studio-gold font-bold text-xl hover:border-yellow-400 hover:scale-105 transition-all shadow-xl"
          >
            Art for sale!
          </Link>
        </div>
      </section>

      <hr className="border-t border-studio-gold/20 max-w-5xl mx-auto w-full" />

      {/* 3. Spotlight Section Two: Workshops & World-Class Exhibitions */}
      <section id="two" className="py-20 px-4 max-w-6xl mx-auto w-full space-y-10">
        <div className="text-center md:text-left flex flex-col md:flex-row items-start justify-between gap-8">
          <div className="flex-1 space-y-4">
            <h2 className="font-luminari text-3xl md:text-5xl text-[#f0df2a] font-normal">
              Workshops &amp; Exhibitions
            </h2>
            <p className="text-yellow-100/90 text-lg">
              Anuradha Govarthanan has carried out many workshops and has participated in many
              world-class exhibitions.
            </p>

            {/* Bulleted achievements with verified historical events */}
            <ul className="space-y-3 text-left font-sans text-base text-[#f6ffa1]">
              <li className="flex items-start gap-2">
                <span className="text-studio-gold text-lg mt-0.5">•</span>
                <span>Corporate workshop in MNC Hyderabad and Bangalore on Theme Global Warming.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-studio-gold text-lg mt-0.5">•</span>
                <span>Art exhibition in State Art Gallery on the theme Ganesha 2023.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-studio-gold text-lg mt-0.5">•</span>
                <span>Exhibited artwork for Telangana Formation Day 2021.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-studio-gold text-lg mt-0.5">•</span>
                <span>Exhibition in State Art Gallery by Hyderabad Art Festival 2023.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-studio-gold text-lg mt-0.5">•</span>
                <span>Golden Award in international art competition organised by Shiny Colours Bangalore.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-studio-gold text-lg mt-0.5">•</span>
                <span>Art workshop as a part of foreign exchange program in University of Hyderabad 2019.</span>
              </li>
            </ul>

            <div className="pt-4">
              <a
                href={studioMeta.eventsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#370e55] border-2 border-purple-300 text-studio-gold font-bold text-lg hover:border-yellow-400 hover:scale-105 transition-all shadow-xl"
              >
                <span>New events</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Scroller for Workshops */}
          <div className="w-full md:w-1/2">
            <AutoScroller items={workshopGallery} itemHeight="h-72" />
          </div>
        </div>
      </section>

      <hr className="border-t border-studio-gold/20 max-w-5xl mx-auto w-full" />

      {/* 4. Spotlight Section Three: Testimonies & Student Success */}
      <section id="three" className="py-20 px-4 max-w-6xl mx-auto w-full space-y-8">
        <div className="text-center space-y-3">
          <h2 className="font-luminari text-3xl md:text-5xl text-[#f0df2a] font-normal">
            Testimonies
          </h2>
          <p className="text-yellow-100/90 text-lg">
            The students are very happy with the results that they have gotten through Anugruja Art School.
          </p>
        </div>

        {/* Student Testimonial Artwork Scroller */}
        <AutoScroller items={testimonialGallery} itemHeight="h-64" />

        {/* Highlighted Quote Block */}
        <div className="max-w-4xl mx-auto p-8 rounded-2xl bg-[#1b0629]/90 border border-studio-gold/40 shadow-2xl backdrop-blur-sm relative">
          <p className="text-yellow-50/90 leading-relaxed text-base md:text-lg italic text-justify">
            &ldquo;Under Teacher Anuradha&apos;s tutelage for three years, I&apos;ve grown through group sessions,
            diverse workshops, and private classes. Her unparalleled expertise fosters a supportive
            learning environment, offering constructive criticism and encouragement. Private sessions
            notably enhanced my skills, pushing boundaries with newfound mediums like charcoal and
            watercolor, even conquering portrait art. Anuradha&apos;s guidance transformed my artistic
            abilities, making her classes a must for artists of any level, promising novel skills from
            the best teacher.&rdquo;
          </p>
        </div>
      </section>

      {/* 5. Direct Contact Action Bridge */}
      <section className="py-12 px-4 text-center">
        <h3 className="font-blippo text-2xl text-studio-gold mb-2">
          Get in Touch with Master Artist Anuradha
        </h3>
        <p className="text-yellow-200/80 text-sm mb-6">
          Direct inquiries for painting sales, workshops, or custom commissions
        </p>
        <ContactActionButtons />
      </section>
    </div>
  );
}
