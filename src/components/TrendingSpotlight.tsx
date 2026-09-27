import Link from 'next/link';

export interface SpotlightData {
  category: string;
  headline: string;
  dateBadge: string;
  seatsNote: string | null;
  href: string;
}

/** The hero owns this in-flow link; Header owns its own bounded ticker. */
export default function TrendingSpotlight({ data }: { data: SpotlightData | null }) {
  if (!data) return null;

  return (
    <div className="spotlight-slot">
      <Link href={data.href} className="spotlight-pill">
        <span className="pulsing-status-dot" aria-hidden />
        <span className="spotlight-cat">{data.category}</span>
        <span className="spotlight-title">{data.headline}</span>
        <span className="spotlight-date">{data.dateBadge}</span>
        {data.seatsNote && <span className="spotlight-seats">{data.seatsNote}</span>}
        <span className="spotlight-arrow" aria-hidden>↗</span>
      </Link>
    </div>
  );
}
