import { studioMeta } from '@/data/artData';
import { formatPrice } from '@/lib/price';

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

export function paintingInquiryLink(title: string, price?: number | string): string {
  const formatted = formatPrice(price);
  const listed = formatted
    ? `and I am interested in inquiring about this painting, which is listed at ${formatted}.`
    : 'and I am interested in inquiring about this painting.';

  const message = [
    `Hi! I came across "${title}" on the Anugruja Arts Studio website`,
    listed,
    'Could you please share its availability and shipping details?',
  ].join(' ');

  return `${studioMeta.whatsappWaMe}?text=${encodeURIComponent(message)}`;
}
