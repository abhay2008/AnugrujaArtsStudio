import type { Metadata, Viewport } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LightboxProvider } from '@/components/LightboxContext';
import LightboxModal from '@/components/LightboxModal';
import StudioPreloader from '@/components/StudioPreloader';
import ScrollReveal from '@/components/ScrollReveal';
import { ThemeProvider } from '@/context/ThemeContext';
import ThemeScript from '@/components/ThemeScript';
import PageAmbient from '@/components/PageAmbient';

export const metadata: Metadata = {
  title: 'Anugruja Arts Studio — Anuradha Govarthanan',
  description:
    'Commercial web platform and fine arts portfolio for Anugruja Arts Studio, featuring original watercolor paintings, fine arts diploma courses, workshops, and custom art commissions.',
  keywords: [
    'Anugruja Arts Studio',
    'Anuradha Govarthanan',
    'Art for sale',
    'Watercolor paintings',
    'Fine arts classes',
    'Art workshops',
    'Art commissions',
  ],
  authors: [{ name: 'Abhay Kashyap' }],
  icons: {
    icon: '/images/logo.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#100318',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#100318" />
        <ThemeScript />
      </head>
      <body className="site-body min-h-screen flex flex-col antialiased">
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
      </body>
    </html>
  );
}
