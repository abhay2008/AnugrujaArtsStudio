/* ==========================================================================
   Anugruja Arts Studio — Unified Gallery Scroller & Slideshow Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Auto-scrollers with Pause on Hover & Touch
  const scrollers = document.querySelectorAll('.art-scroller');
  scrollers.forEach((scroller) => {
    let scrollInterval = null;
    let isHovered = false;

    const startAutoScroll = () => {
      if (scrollInterval) return;
      scrollInterval = setInterval(() => {
        if (isHovered) return;
        const maxScroll = scroller.scrollWidth - scroller.clientWidth;
        const nextPos = scroller.scrollLeft + 320;
        if (scroller.scrollLeft >= maxScroll - 20) {
          scroller.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          scroller.scrollTo({ left: nextPos, behavior: 'smooth' });
        }
      }, 3000);
    };

    const stopAutoScroll = () => {
      clearInterval(scrollInterval);
      scrollInterval = null;
    };

    scroller.addEventListener('mouseenter', () => { isHovered = true; });
    scroller.addEventListener('mouseleave', () => { isHovered = false; });
    scroller.addEventListener('touchstart', () => { isHovered = true; }, { passive: true });
    scroller.addEventListener('touchend', () => {
      setTimeout(() => { isHovered = false; }, 2000);
    });

    startAutoScroll();
  });

  // 2. Initialize Slideshows (.slideshow-container)
  const slideshows = document.querySelectorAll('.slideshow-container');
  slideshows.forEach((container) => {
    const slides = container.querySelectorAll('.mySlides');
    if (!slides.length) return;

    let currentIndex = 0;
    let slideTimer = null;

    const renderSlide = (index) => {
      if (index >= slides.length) currentIndex = 0;
      else if (index < 0) currentIndex = slides.length - 1;
      else currentIndex = index;

      slides.forEach((s, idx) => {
        s.style.display = idx === currentIndex ? 'block' : 'none';
      });
    };

    const nextSlide = () => {
      renderSlide(currentIndex + 1);
    };

    const prevSlide = () => {
      renderSlide(currentIndex - 1);
    };

    const startTimer = () => {
      if (slideTimer) clearInterval(slideTimer);
      slideTimer = setInterval(nextSlide, 3500);
    };

    renderSlide(0);
    startTimer();

    const prevBtn = container.querySelector('.slideshow-nav-btn.prev');
    const nextBtn = container.querySelector('.slideshow-nav-btn.next');

    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        prevSlide();
        startTimer();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        nextSlide();
        startTimer();
      });
    }

    container.addEventListener('mouseenter', () => clearInterval(slideTimer));
    container.addEventListener('mouseleave', startTimer);
  });
});

// Global Toggle for About Read More
function toggleReadMore() {
  const dots = document.getElementById("dots");
  const moreText = document.getElementById("more");
  const btnText = document.getElementById("myBtn");

  if (!dots || !moreText || !btnText) return;

  if (dots.style.display === "none") {
    dots.style.display = "inline";
    btnText.innerHTML = "Read more";
    moreText.style.display = "none";
  } else {
    dots.style.display = "none";
    btnText.innerHTML = "Read less";
    moreText.style.display = "inline";
  }
}
