'use client';

import { CSSProperties } from 'react';

const dots = [
  { fill: '#f0df2a', delay: 0 },
  { fill: '#ff5252', delay: 1 },
  { fill: '#e040fb', delay: 2 },
  { fill: '#00e5ff', delay: 3 },
];

/**
 * Decorative orbiting palette ring around the studio logo.
 * Pure CSS animation (SVG animateTransform) — zero JS, zero animation libraries.
 */
export default function AnimeHeroGraphics() {
  return (
    <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center select-none pointer-events-none">
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full absolute inset-0 drop-shadow-[0_0_20px_rgba(242,215,112,0.35)]"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="studioGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F2D770" />
            <stop offset="50%" stopColor="#e040fb" />
            <stop offset="100%" stopColor="#00e5ff" />
          </linearGradient>
        </defs>

        {/* Static faint ring */}
        <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(242, 215, 112, 0.18)" strokeWidth="3" />

        {/* Pulsing gradient arc */}
        <circle
          className="animate-pulse-soft"
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke="url(#studioGoldGradient)"
          strokeWidth="3"
          strokeDasharray="160 50"
          style={{ transformOrigin: '100px 100px' } as CSSProperties}
        />

        {/* Second dashed ring rotating slowly */}
        <circle
          cx="100"
          cy="100"
          r="92"
          fill="none"
          stroke="rgba(224, 64, 251, 0.25)"
          strokeWidth="1.5"
          strokeDasharray="10 14"
          strokeLinecap="round"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 100 100"
            to="360 100 100"
            dur="24s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Orbiting palette dots */}
        {dots.map((dot, i) => (
          <g key={i}>
            <circle
              cx="100"
              cy="20"
              r="7"
              fill={dot.fill}
              filter={`drop-shadow(0 0 6px ${dot.fill})`}
              style={{ transformOrigin: '100px 100px' } as CSSProperties}
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                from={`${dot.delay * 90} 100 100`}
                to={`${360 + dot.delay * 90} 100 100`}
                dur="14s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="r"
                values="7;9;7"
                dur="3.5s"
                begin={`${dot.delay * 0.4}s`}
                repeatCount="indefinite"
              />
            </circle>
          </g>
        ))}
      </svg>
    </div>
  );
}
