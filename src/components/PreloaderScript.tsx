/**
 * Runs before first paint (sits in <head>).
 *
 * On the first visit of a browser session it stamps `data-preloader="on"`
 * on <html> so the intro overlay and the scroll-lock engage before the
 * page paints — "Anugruja Arts Studio" is then the literal first thing
 * rendered, not something that appears after hydration.
 *
 * Repeat visits / reduced-motion users get no attribute, and the overlay
 * stays `display: none` via CSS, so there is never a flash-then-remove.
 *
 * A `lite`-tier device (src/lib/perfTier.ts, already stamped above this
 * script) is skipped outright: the intro is a full-screen animated overlay
 * that holds the hero off screen for its duration, which is a poor trade on
 * the hardware that can least afford it. Nothing is shown, nothing is locked,
 * and the hero becomes the first paint.
 *
 * The crest image is preloaded from here rather than as a static <link> in
 * the layout, so a visitor who will never see the intro never fetches it.
 */
export default function PreloaderScript() {
  const script = `(function(){try{
    var force=new URLSearchParams(location.search).get('intro')==='true';
    var shown=sessionStorage.getItem('anugruja-preloader-shown');
    var reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    var d=document.documentElement;
    var lite=d.getAttribute('data-perf')==='lite';
    if(lite&&!force)return;
    if(force||(!shown&&!reduced)){
      try{
        var l=document.createElement('link');
        l.rel='preload';l.as='image';l.href='/images/logo-intro.png';l.fetchPriority='high';
        document.head.appendChild(l);
      }catch(e){}
      d.setAttribute('data-preloader','on');
      d.classList.add('preloader-lock');
      try{sessionStorage.setItem('anugruja-preloader-shown','shown');}catch(e){}
    }
  }catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
