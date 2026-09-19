import LandingHero from '@/components/LandingHero';
import Carousel3D from '@/components/Carousel3D';
import QuickNav from '@/components/QuickNav';
import Reveal from '@/components/Reveal';
import ArtistJourneySection from '@/components/ArtistJourneySection';
import AccoladesSection from '@/components/AccoladesSection';
import UpcomingEventsSection from '@/components/UpcomingEventsSection';
import {
  workshopGallery,
  testimonialGallery,
  saleGallery,
  buyShowcaseItems,
  quickNavListings,
  studioMeta,
  upcomingEvents,
} from '@/data/artData';
import {
  Sparkles,
  Award,
  HeartHandshake,
  ShoppingBag,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="landing-page relative flex flex-col w-full overflow-x-hidden">
      <LandingHero />

      {/* 2. BUY PAINTINGS — height-locked 100dvh showcase (zero page scroll) */}
      {/* .buy-showcase-lock owns the viewport-height lock (vh first, dvh second —
          older Windows Chromium engines ignore dvh units entirely and without
          the fallback the section collapses to content height). */}
      <section
        id="buy-paintings"
        className="buy-showcase-lock landing-section relative mx-auto flex min-h-0 w-full max-w-7xl flex-col justify-between overflow-hidden px-4 py-8 sm:pb-[4.75rem] sm:pt-[4.6em] sm:px-6"
      >
        <Reveal className="showcase-head shrink-0 space-y-1.5 text-center">
          <div className="inline-flex items-center gap-2 rounded-full glass-pill px-3 py-1 text-section-kicker text-studio-sunset">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Originals Ready to Own</span>
          </div>
          <h2 className="showcase-title font-decorative font-bold tracking-wide text-studio-gold">
            Buy Paintings
          </h2>
          <p className="mx-auto max-w-xl font-editorial font-medium text-[clamp(0.82rem,1.6vh,1.05rem)] italic text-theme-muted">
            Handcrafted watercolours &amp; realistic art, straight from the studio
          </p>
          <p className="mx-auto hidden max-w-2xl font-sans-ui font-medium text-[clamp(0.78rem,1.4vh,0.95rem)] text-theme-muted sm:block">
            Three works in view — the centre piece takes the spotlight. Swipe or use the arrows,
            tap to inspect, then inquire on WhatsApp.
          </p>
        </Reveal>

        <Reveal variant="fade" delay={120} className="flex min-h-0 w-full flex-1 items-stretch">
          {/* Catalog spotlight — disjoint from the hero flagship rail by construction. */}
          <Carousel3D items={buyShowcaseItems} variant="spotlight" autoAdvanceIntervalMs={4600} />
        </Reveal>
      </section>

      {/* 4. The Master's Journey — sticky, scroll-driven narrative timeline */}
      <ArtistJourneySection />

      <hr className="ornate-rule" />

      {/* 5. Workshops & Events — every image carries its story */}
      <section
        id="workshops"
        className="landing-section section-atelier mx-auto w-full max-w-7xl space-y-8 px-4 py-[clamp(2.5rem,7vh,4.5rem)] scroll-mt-20 sm:px-8"
      >
        <Reveal delay={100} variant="fade">
          <UpcomingEventsSection events={upcomingEvents} />
        </Reveal>

        <Reveal className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-pill text-section-kicker text-studio-sunset">
            <Award className="w-3.5 h-3.5 text-studio-sunset" />
            <span>Global Honors &amp; Masterclasses</span>
          </div>
          <h2 className="font-decorative text-section-title text-studio-gold font-bold">
            Workshops &amp; Exhibitions
          </h2>
          <span className="section-accent" aria-hidden />
          <p className="font-editorial text-section-lead max-w-3xl mx-auto">
            Master Artist Anuradha Govarthanan has led numerous prestigious workshops and exhibited
            in world-class art showcases. Shuffle the deck to walk through the halls.
          </p>
        </Reveal>

        <Reveal delay={170} variant="fade">
          <Carousel3D items={workshopGallery} variant="deck" />
        </Reveal>
      </section>

      <hr className="ornate-rule" />

      {/* Achievements, honours & global footprint (studioData-driven) */}
      <AccoladesSection />

      {/* 6. Testimonies — student wall, fully user-driven */}
      <section
        id="three"
        className="landing-section section-wall mx-auto w-full max-w-7xl space-y-8 px-4 py-[clamp(2.5rem,7vh,4.5rem)] scroll-mt-20 sm:px-8"
      >
        <Reveal className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-pill text-section-kicker text-studio-sunset mb-1">
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Community &amp; Mentorship</span>
          </div>
          <h2 className="font-decorative text-section-title text-studio-gold font-bold">
            Testimonies
          </h2>
          <span className="section-accent" aria-hidden />
          <p className="font-editorial text-section-lead italic max-w-2xl mx-auto">
            The students are very happy with the results that they have gotten through Anugruja Art School.
          </p>
        </Reveal>

        <Reveal delay={100} variant="fade">
          <Carousel3D items={testimonialGallery} variant="polaroid" />
        </Reveal>

        {/* Highlighted Quote Block */}
        <Reveal delay={150}>
          <div className="glass-panel-sunset max-w-4xl mx-auto p-6 sm:p-10 rounded-3xl relative overflow-hidden shadow-2xl">
            <span className="absolute -top-4 left-6 text-7xl sm:text-8xl text-studio-sunset/20 font-serif-display leading-none select-none pointer-events-none">
              &ldquo;
            </span>
            <p className="relative z-10 font-editorial font-semibold text-base sm:text-xl text-theme-muted leading-relaxed text-justify sm:text-left italic">
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

      {/* 7. Direct Contact Action Bridge */}
      <section className="py-12 px-4 text-center">
        <Reveal>
          <h3 className="font-decorative text-2xl sm:text-3xl gold-sunset-shimmer mb-2">
            Get in Touch with Master Artist Anuradha
          </h3>
          <p className="font-serif-display font-medium text-theme-muted text-sm sm:text-base mb-6">
            Direct inquiries for painting sales, workshops, or custom commissions
          </p>
          {/* ContactActionButtons inlined (Gmail + WhatsApp) */}
          <div className="w-full max-w-md mx-auto my-6 px-0">
            <div className="glass-panel-sunset rounded-3xl p-2.5 sm:p-3 border border-studio-sunset/30 shadow-2xl flex items-center justify-between gap-3 sm:gap-4">
              <a
                href={`mailto:${studioMeta.email}`}
                className="contact-action-primary touch-target flex-1 min-h-[48px] flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-blippo text-sm sm:text-base font-bold transition-all transform hover:scale-105 active:scale-95 shadow-md"
              >
                <svg className="w-5 h-5 fill-current text-studio-sunset" viewBox="0 0 24 24">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
                <span>Gmail</span>
              </a>
              <a
                href={studioMeta.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="touch-target flex-1 min-h-[48px] flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-950/70 hover:bg-emerald-900/90 border border-emerald-500/40 text-emerald-200 hover:text-white font-blippo text-sm sm:text-base font-bold transition-all transform hover:scale-105 active:scale-95 shadow-md"
              >
                <svg className="w-5 h-5 fill-current text-emerald-400" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Sticky quick-nav shortcuts (slides up after the banner) */}
      <QuickNav items={quickNavListings} />
    </div>
  );
}
