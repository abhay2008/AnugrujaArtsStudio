import { CSSProperties } from 'react';

const dots = [
  { fill: '#f97316', delay: 0, r: 7 }, // Sunset Orange
  { fill: '#F2D770', delay: 1, r: 8 }, // Antique Gold
  { fill: '#e040fb', delay: 2, r: 6.5 }, // Royal Magenta
  { fill: '#fb923c', delay: 3, r: 7.5 }, // Sunset Amber
];

/**
 * Decorative orbiting motion graphic mandala around the studio logo.
 * Harmonizes royal purple, antique gold, and warm sunset orange accents.
 * Pure lightweight SVG animations with zero runtime JS overhead.
 */
export default function AnimeHeroGraphics() {
  return (
    <div className="relative w-56 h-56 sm:w-72 sm:h-72 md:w-84 md:h-84 flex items-center justify-center select-none pointer-events-none">
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full absolute inset-0 drop-shadow-[0_0_25px_rgba(249,115,22,0.35)]"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="sunsetGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="35%" stopColor="#F2D770" />
            <stop offset="70%" stopColor="#e040fb" />
            <stop offset="100%" stopColor="#fb923c" />
          </linearGradient>
          <radialGradient id="ambientOrbitalGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(249, 115, 22, 0.25)" />
            <stop offset="50%" stopColor="rgba(242, 215, 112, 0.12)" />
            <stop offset="100%" stopColor="rgba(43, 8, 68, 0)" />
          </radialGradient>
        </defs>

        {/* Ambient radial glow background */}
        <circle cx="100" cy="100" r="95" fill="url(#ambientOrbitalGlow)" />

        {/* Static faint guide ring */}
        <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(242, 215, 112, 0.2)" strokeWidth="2.5" />

        {/* Pulsing gradient arc */}
        <circle
          className="animate-pulse-soft"
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke="url(#sunsetGoldGradient)"
          strokeWidth="3.5"
          strokeDasharray="150 60"
          style={{ transformOrigin: '100px 100px' } as CSSProperties}
        />

        {/* Outer dashed ring rotating clockwise */}
        <circle
          cx="100"
          cy="100"
          r="92"
          fill="none"
          stroke="rgba(249, 115, 22, 0.4)"
          strokeWidth="1.5"
          strokeDasharray="8 12"
          strokeLinecap="round"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 100 100"
            to="360 100 100"
            dur="22s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Inner delicate dashed ring rotating counter-clockwise */}
        <circle
          cx="100"
          cy="100"
          r="68"
          fill="none"
          stroke="rgba(242, 215, 112, 0.3)"
          strokeWidth="1.2"
          strokeDasharray="4 8"
          strokeLinecap="round"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="360 100 100"
            to="0 100 100"
            dur="28s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Orbiting palette dots with sunset amber, gold, magenta */}
        {dots.map((dot, i) => (
          <g key={i}>
            <circle
              cx="100"
              cy="20"
              r={dot.r}
              fill={dot.fill}
              filter={`drop-shadow(0 0 8px ${dot.fill})`}
              style={{ transformOrigin: '100px 100px' } as CSSProperties}
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                from={`${dot.delay * 90} 100 100`}
                to={`${360 + dot.delay * 90} 100 100`}
                dur="13s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="r"
                values={`${dot.r};${dot.r + 2.5};${dot.r}`}
                dur="3.2s"
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
