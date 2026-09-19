/**
 * Price formatting + the public "price pending" system.
 *
 * The studio has not published real prices yet, so the public site never shows
 * a number unless an admin has explicitly saved one. Every artwork can carry a
 * `priceConfirmedAt` timestamp: it is stamped automatically by every admin
 * price-edit path (gallery manager, section editor, upload wizard — both this
 * console and the standalone admin portal) the moment a price is stored.
 *
 * - No `priceConfirmedAt` → the public site shows the masked label "XXXX" with
 *   a small "contact the studio" note, and the chatbot / WhatsApp inquiry
 *   prefills never quote a figure either.
 * - `priceConfirmedAt` set → the real price renders everywhere as before.
 */

/** Copy shown under a masked price. One source of truth for every surface. */
export const PRICE_PENDING_NOTE = 'Contact the studio for the actual cost';

/** The mask shown instead of an unconfirmed price. */
export const PRICE_PENDING_LABEL = 'XXXX';

/** Anything with a price-shaped field (ArtItem, admin-repo Artwork, …). */
type PriceBearing = { price?: number | string; priceConfirmedAt?: string | boolean };

/**
 * Has an admin actually saved this painting's price? Legacy truthy values
 * (a bare `true`) are accepted so content written by the older portal still
 * counts as confirmed.
 */
export function isPriceConfirmed(art?: PriceBearing | null): boolean {
  if (!art || art.price === undefined || art.price === null || String(art.price).trim() === '') {
    return false;
  }
  return Boolean(art.priceConfirmedAt);
}

/**
 * Admin-side formatting (console lists, gallery manager, review sheets).
 * Unchanged from the original behaviour — bare numbers get a ₹ prefix and
 * Indian-style grouping; non-numeric text passes through untouched.
 */
export function formatPrice(price?: number | string): string {
  if (price === undefined || price === null || price === '') return '';
  const str = String(price).trim();
  if (!str) return '';
  const digits = str.replace(/[^0-9.]/g, '');
  if (!digits || isNaN(Number(digits))) return str; // e.g. "Price on request"
  const num = Number(digits);
  return '₹' + num.toLocaleString('en-IN');
}

/**
 * Public display label for one painting's price.
 * `confirmed` prices render formatted; `showPending` contexts (the buy/sale
 * surfaces) mask anything unconfirmed to XXXX — the caller pairs it with
 * {@link priceNote}. Without `showPending`, an unconfirmed price renders as
 * nothing (non-sale galleries never display a price at all).
 */
export function publicPriceLabel(price?: number | string, confirmed?: boolean, showPending?: boolean): string {
  if (confirmed) return formatPrice(price);
  return showPending ? PRICE_PENDING_LABEL : '';
}

/**
 * The small line that accompanies a masked price ("Contact the studio for the
 * actual cost"). Empty when the price is confirmed, so callers can render it
 * conditionally without duplicating the rule.
 */
export function priceNote(confirmed?: boolean): string {
  return confirmed ? '' : PRICE_PENDING_NOTE;
}
