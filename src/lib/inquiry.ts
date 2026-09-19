import { studioMeta } from '@/data/artData';
import { formatPrice, isPriceConfirmed } from '@/lib/price';

/**
 * Prefilled WhatsApp inquiry for one painting — same artist number as the
 * header contact, opened as a wa.me deep link so the message arrives typed.
 */
export function eventRegistrationLink(title: string, date?: string): string {
  const message = [
    `Hi! I am interested in registering for "${title}"${date ? ` (${date})` : ''}.`,
    'Please share the registration details, availability and payment information.',
  ].join(' ');

  return `${studioMeta.whatsappWaMe}?text=${encodeURIComponent(message)}`;
}

/**
 * Public inquiry links must never leak an unconfirmed figure. A confirmed
 * price is quoted; otherwise the message simply asks the studio for the
 * actual cost — the XXXX mask is a website-display device, not something
 * the visitor needs to repeat back to the artist.
 */
export function paintingInquiryLink(title: string, price?: number | string, priceConfirmedAt?: string | boolean): string {
  const confirmed = isPriceConfirmed({ price, priceConfirmedAt });
  const listed = confirmed
    ? `and I am interested in inquiring about this painting, which is listed at ${formatPrice(price)}.`
    : 'and I am interested in inquiring about this painting.';
  const message = [
    `Hi! I came across "${title}" on the Anugruja Arts Studio website`,
    listed,
    'Could you please share its actual cost, availability and shipping details?',
  ].join(' ');
  return `${studioMeta.whatsappWaMe}?text=${encodeURIComponent(message)}`;
}
