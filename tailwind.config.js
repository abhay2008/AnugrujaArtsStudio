/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          bg: "#100318",
          dark: "#190626",
          card: "#260a3a",
          purple: "#4d1d6f",
          royal: "#2b0844",
          deep: "#140420",
          gold: "#F2D770",
          yellow: "#f0df2a",
          amber: "#d1a515",
          highlight: "#ffe76c",
          accent: "#e040fb",
          sunset: {
            light: "#fb923c",
            DEFAULT: "#f97316",
            deep: "#ea580c",
            dark: "#c2410c",
          },
          border: "rgba(242, 215, 112, 0.35)",
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
