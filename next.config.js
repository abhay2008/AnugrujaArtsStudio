/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Build output directory. Overridable so a second dev server can run in the
  // same checkout (e.g. a preview thread) without two processes corrupting each
  // other's shared .next cache. Start it with NEXT_DIST_DIR=<dir> npm run dev.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: {
    // Remote inventory placeholders (studioData.featuredPaintings[].image).
    // Prefer uploading the real studio photograph instead — it carries the
    // correct provenance and renders without a third-party round trip.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/photo-**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    qualities: [75, 80, 85, 90],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000,
  },
  experimental: {
    // animejs was dropped with the carousel stage pulse (now a compositor-driven
    // Web Animation in Carousel3D) — nothing imports it any more.
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

module.exports = nextConfig;
