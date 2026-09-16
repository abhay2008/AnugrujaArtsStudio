import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LightboxProvider } from '@/components/LightboxContext';
import LightboxModal from '@/components/LightboxModal';
import StudioPreloader from '@/components/StudioPreloader';
import ScrollReveal from '@/components/ScrollReveal';
import { ThemeProvider } from '@/context/ThemeContext';
import PageAmbient from '@/components/PageAmbient';

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
      <PageAmbient />
      <LightboxProvider>
        <StudioPreloader />
        <ScrollReveal />
        <Header />
        {/* The header is sticky and in-flow, so it already reserves its own space. */}
        <main className="relative z-[1] flex-grow">{children}</main>
        <Footer />
        <LightboxModal />
      </LightboxProvider>
    </ThemeProvider>
  );
}
