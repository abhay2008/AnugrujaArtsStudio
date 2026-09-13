/* ==========================================================================
   Anugruja Arts Studio — Motion Transitions, Smart Auto-Scroller & Lightbox
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Studio Preloader Dismissal
  const preloader = document.getElementById('studio-loader');
  const hideLoader = () => {
    if (preloader && !preloader.classList.contains('loader-hidden')) {
      preloader.classList.add('loader-hidden');
    }
  };
  window.addEventListener('load', () => {
    setTimeout(hideLoader, 450);
  });
  setTimeout(hideLoader, 1500); // Fail-safe

  // 2. Section Intersection Observer for Smooth Viewport Entrance
  const animatedSections = document.querySelectorAll('.spotlight, .wrapper');
  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('section-in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    animatedSections.forEach((section) => {
      sectionObserver.observe(section);
    });
  } else {
    animatedSections.forEach((section) => {
      section.classList.add('section-in-view');
    });
  }

  // 3. Smart Multi-Scroller Auto-Advance with Touch-Pause
  const scrollers = document.querySelectorAll('.scroller');
  scrollers.forEach((scroller) => {
    let isInteracting = false;
    let resumeTimeout;

    const pause = () => {
      isInteracting = true;
      clearTimeout(resumeTimeout);
    };

    const resume = (delay = 2500) => {
      clearTimeout(resumeTimeout);
      resumeTimeout = setTimeout(() => {
        isInteracting = false;
      }, delay);
    };

    // User Interaction Listeners
    scroller.addEventListener('mouseenter', pause);
    scroller.addEventListener('mouseleave', () => resume(1500));
    scroller.addEventListener('touchstart', pause, { passive: true });
    scroller.addEventListener('touchend', () => resume(3000));
    scroller.addEventListener('scroll', () => {
      if (!isInteracting) {
        pause();
        resume(2000);
      }
    }, { passive: true });

    // Auto-advance loop every 2.8s
    setInterval(() => {
      if (isInteracting) return;
      
      const firstChild = scroller.querySelector('img');
      const stepWidth = firstChild ? firstChild.clientWidth + 16 : 280;
      const maxScroll = scroller.scrollWidth - scroller.clientWidth;

      if (scroller.scrollLeft >= maxScroll - 15) {
        scroller.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        scroller.scrollBy({ left: stepWidth, behavior: 'smooth' });
      }
    }, 2800);
  });

  // 4. Tap-to-Zoom Lightbox Modal Setup
  let lightbox = document.getElementById('art-lightbox');
  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.id = 'art-lightbox';
    lightbox.innerHTML = `
      <div id="lightbox-close" aria-label="Close Lightbox">&times;</div>
      <img id="lightbox-img" src="" alt="Zoomed Painting">
    `;
    document.body.appendChild(lightbox);

    const closeBtn = document.getElementById('lightbox-close');
    const closeLightbox = () => {
      lightbox.classList.remove('lightbox-active');
    };

    closeBtn.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLightbox();
    });
  }

  // Attach Lightbox click to all artwork images
  const allArtworkImgs = document.querySelectorAll('.scroller img, .mySlides');
  allArtworkImgs.forEach((img) => {
    img.addEventListener('click', () => {
      const lightboxImg = document.getElementById('lightbox-img');
      if (lightboxImg && img.src) {
        lightboxImg.src = img.src;
        lightbox.classList.add('lightbox-active');
      }
    });
  });
});
