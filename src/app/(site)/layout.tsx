import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LightboxProvider } from '@/components/LightboxContext';
import DeferredLightbox from '@/components/DeferredLightbox';
import ScrollReveal from '@/components/ScrollReveal';
import { ThemeProvider } from '@/context/ThemeContext';
import PageAmbient from '@/components/PageAmbient';
import DeferredChatWidget from '@/components/chat/DeferredChatWidget';
import SeoStructuredData from '@/components/SeoStructuredData';

/**
 * Public site surface: everything a visitor sees.
 * Kept apart from the admin/login surfaces so their chrome never overlaps.
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <SeoStructuredData />
      <PageAmbient />
      <LightboxProvider>
        <ScrollReveal />
        <Header />
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
