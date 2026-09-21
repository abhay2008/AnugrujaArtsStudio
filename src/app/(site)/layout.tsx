import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LightboxProvider } from '@/components/LightboxContext';
import DeferredLightbox from '@/components/DeferredLightbox';
import ScrollReveal from '@/components/ScrollReveal';
import TierProbe from '@/components/TierProbe';
import { ThemeProvider } from '@/context/ThemeContext';
import PageAmbient from '@/components/PageAmbient';
import DeferredChatWidget from '@/components/chat/DeferredChatWidget';
import SeoStructuredData from '@/components/SeoStructuredData';
import { resolveSpotlight } from '@/lib/spotlightFeed';

/**
 * Public site surface: everything a visitor sees.
 * Kept apart from the admin/login surfaces so their chrome never overlaps.
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /* The header's occasional ticker swaps the wordmark for this announcement.
     Resolved on the server; null simply means the ticker stays a wordmark. */
  const trendingTeaser = resolveSpotlight();

  return (
    <ThemeProvider>
      <SeoStructuredData />
      <PageAmbient />
      <LightboxProvider>
        <ScrollReveal />
        {/* Demotes a device that turns out to be slower than its API profile
            suggested (see armTierProbe) — CSS-only, so it never re-renders. */}
        <TierProbe />
        <Header teaser={trendingTeaser} />
        {/* The header is sticky and in-flow, so it already reserves its own space. */}
        <main className="relative z-[1] flex-grow">{children}</main>
        <Footer />
        {/* Both of these are code-split and mount on demand: the lightbox when a
            painting is opened, the chat widget on the first idle moment. */}
        <DeferredLightbox />
        <DeferredChatWidget />
      </LightboxProvider>
    </ThemeProvider>
  );
}
