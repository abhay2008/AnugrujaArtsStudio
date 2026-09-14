/**
 * Consistent price formatting across public site and admin.
 * Matches Jeeva reference behavior: bare numbers get a ₹ prefix and
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
