/**
 * The trending announcement feed.
 *
 * One resolver for every surface that shows the announcement (hero pill, chat
 * context, header teaser) so the home page, the header ticker and the chat
 * assistant can never disagree about what's coming. Falls back to the editorial
 * spotlight in studioData when no CMS event exists. Pure data — no client
 * hooks — so both server and client components can import it.
 */
import { studioData } from '@/data/studioData';
import initialContent from '../../content/site.json';
import type { SiteContent } from '@/lib/types';

export interface SpotlightData {
  category: string;
  headline: string;
  dateBadge: string;
  seatsNote: string | null;
  href: string;
}

export function resolveSpotlight(): SpotlightData | null {
  const { spotlight } = studioData;
  const events = (initialContent as unknown as SiteContent).events?.upcoming ?? [];
  const next = events[0];

  if (!next && !spotlight.isActive) return null;

  const seats = next?.seatsRemaining ?? spotlight.seatsRemaining;

  return {
    category: next ? 'Upcoming Workshop' : spotlight.category,
    headline: next?.title ?? spotlight.headline,
    dateBadge: next?.date ?? spotlight.dateBadge,
    // The landing-page announcement should guide visitors to the full event
    // details and registration cards, not skip straight to the external form.
    href: next ? '#workshops' : spotlight.actionUrl,
    seatsNote: seats ? `${seats} seats left` : null,
  };
}
