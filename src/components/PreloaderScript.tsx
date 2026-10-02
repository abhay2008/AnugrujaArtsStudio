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
 * Phones use the short lite intro. Reduced-motion visitors skip it unless
 * explicitly replaying. A pre-hydration safety timer releases the surface
 * even if the JavaScript bundle fails to arrive.
 *
 * The crest image is preloaded from here rather than as a static <link> in
 * the layout, so a visitor who will never see the intro never fetches it.
 */
export default function PreloaderScript() {
  const script = `(function(){try{
    var force=new URLSearchParams(location.search).get('intro')==='true';
    if(location.pathname.indexOf('/admin')===0||location.pathname==='/login')return;
    var shown=null;try{shown=sessionStorage.getItem('anugruja-preloader-shown');}catch(e){}
    var reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    var d=document.documentElement;
    // Mobile keeps the short opacity-only intro; reduced motion skips it.
    if(reduced&&!force)return;
    if(force||(!shown&&!reduced)){
      try{
        var l=document.createElement('link');
        l.rel='preload';l.as='image';l.href='/images/logo-intro.png';l.fetchPriority='high';
        document.head.appendChild(l);
      }catch(e){}
      d.setAttribute('data-preloader','on');
      d.classList.add('preloader-lock');
      setTimeout(function(){if(d.hasAttribute('data-preloader')){d.removeAttribute('data-preloader');d.removeAttribute('data-preloader-exit');d.classList.remove('preloader-lock');var s=document.getElementById('site-surface');if(s)s.inert=false;window.dispatchEvent(new CustomEvent('studio-preloader-complete'));}},8000);
      try{sessionStorage.setItem('anugruja-preloader-shown','shown');}catch(e){}
    }
  }catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
