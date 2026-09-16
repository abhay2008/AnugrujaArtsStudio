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
 */
export default function PreloaderScript() {
  const script = `(function(){try{
    var force=new URLSearchParams(location.search).get('intro')==='true';
    var shown=sessionStorage.getItem('anugruja-preloader-shown');
    var reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(force||(!shown&&!reduced)){
      var d=document.documentElement;
      d.setAttribute('data-preloader','on');
      d.classList.add('preloader-lock');
      try{sessionStorage.setItem('anugruja-preloader-shown','shown');}catch(e){}
    }
  }catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
