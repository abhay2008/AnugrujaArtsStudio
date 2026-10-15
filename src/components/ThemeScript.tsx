/** Runs before paint to avoid theme flash & syncs tab favicon contrast with light/dark browser tabs */
export default function ThemeScript() {
  const script = `(function(){
  try {
    var t = localStorage.getItem('anugruja_theme');
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}
  try {
    var mql = window.matchMedia('(prefers-color-scheme: light)');
    function updateTabFavicon(isLight) {
      var links = document.querySelectorAll("link[rel*='icon']");
      links.forEach(function(l) {
        var h = l.getAttribute('href') || '';
        if (isLight) {
          if (h.indexOf('logo-64.png') !== -1) l.href = '/images/logo-dark-gold-64.png';
          if (h.indexOf('logo-32.png') !== -1) l.href = '/images/logo-dark-gold-32.png';
        } else {
          if (h.indexOf('logo-dark-gold-64.png') !== -1) l.href = '/images/logo-64.png';
          if (h.indexOf('logo-dark-gold-32.png') !== -1) l.href = '/images/logo-32.png';
        }
      });
    }
    if (mql.matches) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { updateTabFavicon(true); });
      } else {
        updateTabFavicon(true);
      }
    }
    if (mql.addEventListener) {
      mql.addEventListener('change', function(e) { updateTabFavicon(e.matches); });
    }
  } catch (e) {}
})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
