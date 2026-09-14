const path = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Absolute globs so JIT still works when `next dev` is launched with cwd=/
  content: [
    path.join(__dirname, 'src/pages/**/*.{js,ts,jsx,tsx,mdx}'),
    path.join(__dirname, 'src/components/**/*.{js,ts,jsx,tsx,mdx}'),
    path.join(__dirname, 'src/app/**/*.{js,ts,jsx,tsx,mdx}'),
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          bg: "var(--color-studio-bg)",
          dark: "var(--color-studio-dark)",
          card: "var(--color-studio-card)",
          purple: "var(--color-studio-purple)",
          royal: "var(--color-studio-royal)",
          deep: "var(--color-studio-deep)",
          gold: "var(--color-gold)",
          yellow: "var(--color-gold-bright)",
          amber: "var(--color-gold-deep)",
          highlight: "var(--color-gold-bright)",
          accent: "var(--color-accent-magenta)",
          sunset: {
            light: "var(--color-sunset-light)",
            DEFAULT: "var(--color-sunset)",
            deep: "var(--color-sunset-deep)",
            dark: "var(--color-sunset-dark)",
          },
          border: "var(--border-soft)",
        },
      },
      fontFamily: {
        blippo: ["Cinzel", "Blippo", "fantasy", "sans-serif"],
        decorative: ["'Cinzel Decorative'", "Cinzel", "serif"],
        editorial: ["'Cormorant Garamond'", "Georgia", "serif"],
        luminari: ["Cinzel", "Luminari", "fantasy", "serif"],
        serifDisplay: ["'Playfair Display'", "'Cormorant Garamond'", "Georgia", "serif"],
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 4s ease-in-out infinite',
        'float-reverse': 'floatReverse 5s ease-in-out infinite',
        'spin-reverse': 'spinReverse 22s linear infinite',
        'shimmer-fast': 'shimmer 3s linear infinite',
        'glow-sunset': 'glowSunset 4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        floatReverse: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(8px)' },
        },
        spinReverse: {
          from: { transform: 'rotate(360deg)' },
          to: { transform: 'rotate(0deg)' },
        },
        glowSunset: {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(242, 215, 112, 0.25), 0 0 40px rgba(249, 115, 22, 0.15)',
          },
          '50%': {
            boxShadow: '0 0 32px rgba(242, 215, 112, 0.45), 0 0 60px rgba(249, 115, 22, 0.3)',
          },
        },
      },
    },
  },
  plugins: [],
};
