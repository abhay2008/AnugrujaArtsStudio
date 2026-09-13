import React from 'react';
import ReactDOM from 'react-dom/client';
import AnimeHeroGraphics from './components/AnimeHeroGraphics';
import './app/globals.css';

function MotionPreview() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center space-y-6">
      <h1 className="font-blippo text-4xl text-studio-gold">
        Anugruja Arts Studio — Motion Graphics &amp; Anime.js Lab
      </h1>
      <p className="text-yellow-200 text-lg">
        Fast Vite-powered HMR preview for canvas, SVG motion and animations
      </p>
      <div className="p-8 rounded-3xl bg-[#190626] border-2 border-studio-gold shadow-2xl">
        <AnimeHeroGraphics />
      </div>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <MotionPreview />
    </React.StrictMode>
  );
}
