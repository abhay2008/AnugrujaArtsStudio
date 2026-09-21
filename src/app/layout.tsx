import type { Metadata, Viewport } from 'next';
import './globals.css';
import './preloader.css';
import ThemeScript from '@/components/ThemeScript';
import PerfTierScript from '@/components/PerfTierScript';
import OsTagScript from '@/components/OsTagScript';
import PreloaderScript from '@/components/PreloaderScript';
import StudioPreloader from '@/components/StudioPreloader';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://anugruja-arts-studio.vercel.app').replace(/\/$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Anugruja Arts Studio — Anuradha Govarthanan',
    template: '%s | Anugruja Arts Studio',
  },
  description:
    'Discover original watercolor paintings, fine arts classes, workshops, and custom commissions by Master Artist Anuradha Govarthanan at Anugruja Arts Studio.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: siteUrl,
    siteName: 'Anugruja Arts Studio',
    title: 'Anugruja Arts Studio — Anuradha Govarthanan',
    description: 'Original watercolor paintings, fine arts classes, workshops, and custom commissions from Anugruja Arts Studio.',
    images: [
      {
        url: '/images/banner.jpeg',
        width: 1200,
        height: 630,
        alt: 'Anugruja Arts Studio — watercolor art and fine arts education',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Anugruja Arts Studio — Anuradha Govarthanan',
    description: 'Original watercolor paintings, fine arts classes, workshops, and custom commissions.',
    images: ['/images/banner.jpeg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  keywords: [
    'Anugruja Arts Studio',
    'Anuradha Govarthanan',
    'Art for sale',
    'Watercolor paintings',
    'Fine arts classes',
    'Art workshops',
    'Art commissions',
  ],
  authors: [{ name: 'Anuradha Govarthanan' }],
  /* Small derivatives of the crest (npm run images:icons). The full-size
     logo.png is 213 KB and is meant for next/image, which re-encodes it per
     request — as a favicon it was fetched whole on every page load. */
  icons: {
    icon: [{ url: '/images/logo-64.png', sizes: '64x64', type: 'image/png' }],
    apple: [{ url: '/images/logo-180.png', sizes: '180x180', type: 'image/png' }],
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
        {/* The preloader crest and name are the first paint — the two intro
            fonts must not arrive after it. The crest image itself is
            preloaded by PreloaderScript instead, because a `lite` device
            never sees the intro and must not pay for its image. */}
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fonts/cinzel-decorative-700.woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fonts/cormorant-garamond-italic.woff2"
          crossOrigin="anonymous"
        />
        <ThemeScript />
        {/* Windows compositing fallbacks must be keyed before any paint. */}
        <OsTagScript />
        {/* Tier first: the preloader and every ambient layer below branch on it. */}
        <PerfTierScript />
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
