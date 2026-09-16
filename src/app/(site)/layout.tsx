import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LightboxProvider } from '@/components/LightboxContext';
import LightboxModal from '@/components/LightboxModal';
import ScrollReveal from '@/components/ScrollReveal';
import { ThemeProvider } from '@/context/ThemeContext';
import PageAmbient from '@/components/PageAmbient';
import ChatWidget from '@/components/chat/ChatWidget';
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
        <LightboxModal />
        <ChatWidget />
      </LightboxProvider>
    </ThemeProvider>
  );
}
