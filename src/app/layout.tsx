import type { Metadata, Viewport } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LightboxProvider } from '@/components/LightboxContext';
import LightboxModal from '@/components/LightboxModal';
import StudioPreloader from '@/components/StudioPreloader';
import ScrollReveal from '@/components/ScrollReveal';

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
    <html lang="en" className="scroll-smooth">
      <body className="bg-[#100318] text-[#fdf5cf] min-h-screen flex flex-col antialiased">
        <LightboxProvider>
          <StudioPreloader />
          <ScrollReveal />
          <Header />
          <main className="flex-grow pt-[4.4em]">{children}</main>
          <Footer />
          <LightboxModal />
        </LightboxProvider>
      </body>
    </html>
  );
}
