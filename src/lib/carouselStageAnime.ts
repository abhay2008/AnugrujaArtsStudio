import { animate } from 'animejs';

/** Brief stage pulse when the carousel advances — complements Framer slide motion */
export function pulseCarouselStage(
  stageEl: HTMLElement | null,
  vitrineEl: HTMLElement | null,
  direction: number
) {
  if (!stageEl) return;

  animate(stageEl, {
    rotateY: [0, direction >= 0 ? -2.5 : 2.5, 0],
    duration: 680,
    ease: 'outExpo',
  });

  if (vitrineEl) {
    animate(vitrineEl, {
      boxShadow: [
        '0 28px 70px -24px rgba(0, 0, 0, 0.45)',
        '0 32px 80px -20px rgba(242, 215, 112, 0.22)',
        '0 28px 70px -24px rgba(0, 0, 0, 0.45)',
      ],
      duration: 720,
      ease: 'outQuad',
    });
  }
}
