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
          gold: "#F2D770",
          yellow: "#f0df2a",
          amber: "#d1a515",
          highlight: "#ffe76c",
          accent: "#e040fb",
          border: "rgba(242, 215, 112, 0.35)",
        },
      },
      fontFamily: {
        blippo: ["Blippo", "fantasy", "sans-serif"],
        luminari: ["Luminari", "fantasy", "serif"],
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        }
      }
    },
  },
  plugins: [],
};
