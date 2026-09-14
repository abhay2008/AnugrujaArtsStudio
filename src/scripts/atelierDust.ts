/**
 * Non-critical ambient gold dust kept separate from the GSAP controller so
 * hydration does not pull the carousel's animation runtime into the first
 * client chunk.
 */
export function initDustParticles(
  container: HTMLElement | null,
  count?: number,
  reducedMotion = false
) {
  if (!container || reducedMotion) return () => {};

  const particleCount = count ?? (window.innerWidth < 768 ? 14 : 24);
  const flakes: HTMLSpanElement[] = [];

  for (let i = 0; i < particleCount; i += 1) {
    const flake = document.createElement('span');
    flake.className = 'atelier-dust-flake';
    flake.style.setProperty('--dust-x', `${(i * 37) % 100}%`);
    flake.style.setProperty('--dust-y', `${(i * 61 + 11) % 100}%`);
    flake.style.setProperty('--dust-size', `${1.5 + ((i * 17) % 18) / 10}px`);
    flake.style.setProperty('--dust-delay', `${-((i * 13) % 7)}s`);
    container.appendChild(flake);
    flakes.push(flake);
  }

  return () => {
    flakes.forEach((flake) => flake.remove());
  };
}

export default initDustParticles;
