/** Runs before paint to avoid theme flash */
export default function ThemeScript() {
  const script = `(function(){try{var t=localStorage.getItem('anugruja_theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
