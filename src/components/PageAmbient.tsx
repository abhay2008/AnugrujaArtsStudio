/** Fixed, theme-aware colour washes behind page content (purple · blue · gold · orange). */
export default function PageAmbient() {
  return (
    <div className="page-ambient" aria-hidden>
      <div className="page-ambient-orb page-ambient-orb-purple" />
      <div className="page-ambient-orb page-ambient-orb-blue" />
      <div className="page-ambient-orb page-ambient-orb-gold" />
      <div className="page-ambient-orb page-ambient-orb-orange" />
    </div>
  );
}
