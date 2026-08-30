/* ==========================================================================
   Anugruja Arts Studio — Motion Transitions & Preloader Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Hide Preloader with Motion Graphic once fully loaded
  const preloader = document.getElementById('studio-loader');
  const hideLoader = () => {
    if (preloader && !preloader.classList.contains('loader-hidden')) {
      preloader.classList.add('loader-hidden');
    }
  };

  // Dismiss loader on window load, with 800ms fallback
  window.addEventListener('load', () => {
    setTimeout(hideLoader, 450);
  });
  setTimeout(hideLoader, 1500); // Safety fallback

  // 2. Smooth momentum pause-on-hover for horizontal scrollers
  const scrollers = document.querySelectorAll('.scroller');
  scrollers.forEach((scroller) => {
    let isHovered = false;
    scroller.addEventListener('mouseenter', () => { isHovered = true; });
    scroller.addEventListener('mouseleave', () => { isHovered = false; });
    scroller.addEventListener('touchstart', () => { isHovered = true; }, { passive: true });
    scroller.addEventListener('touchend', () => {
      setTimeout(() => { isHovered = false; }, 2000);
    });
  });
});
