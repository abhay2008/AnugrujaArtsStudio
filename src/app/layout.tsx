import type { Metadata, Viewport } from 'next';
import './globals.css';
import './preloader.css';
import ThemeScript from '@/components/ThemeScript';
import PreloaderScript from '@/components/PreloaderScript';
import StudioPreloader from '@/components/StudioPreloader';

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

/**
 * Root shell only — no site chrome.
 *
 * The public Header, Footer and ambient layers live in the `(site)` route
 * group so the admin console and the login gate render as standalone
 * surfaces. Sharing the root layout with the public site used to paint the
 * sticky header and the footer directly over the admin workspace.
 */
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
        <PreloaderScript />
      </head>
      <body className="site-body min-h-screen flex flex-col antialiased">
        {/* Intro overlay lives at body level: ancestors like the route
            transition wrapper use transforms, which would turn `fixed`
            into "sized to that div" instead of the viewport. */}
        <StudioPreloader />
        {children}
      </body>
    </html>
  );
}
