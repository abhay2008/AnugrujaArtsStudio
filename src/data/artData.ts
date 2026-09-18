import initialSiteData from '../../content/site.json';
import type { ArtItem, SiteContent, PageListing } from '@/lib/types';
export * from '@/lib/types';

function currentContent(): SiteContent {
  return initialSiteData as unknown as SiteContent;
}

// Dynamic galleries pulling fresh state on server renders
export const featuredGallery = currentContent().galleries.featured;
export const workshopGallery = currentContent().galleries.workshop;
export const testimonialGallery = currentContent().galleries.testimonial;
export const achievementGallery = currentContent().galleries.achievement;
export const classGallery = currentContent().galleries.classes;
export const watercolorGallery = currentContent().galleries.watercolor;
export const saleGallery = currentContent().galleries.sale;
export const commissionGallery = currentContent().galleries.commission;
export const upcomingEvents = currentContent().events?.upcoming ?? [];

// Dynamic accessor function for current galleries
export function getGalleryItems(key: keyof SiteContent['galleries']) {
  return currentContent().galleries[key] || [];
}

// Home-page scroll shortcuts (Buy Paintings, Gallery, Workshops, ...)
export const quickNavListings: PageListing[] =
  currentContent().sections?.pageMeta?.quickNav ?? [];

/**
 * Selection for the Buy Paintings spotlight: the newest priced originals from
 * the sale catalog. Derived content lives here — never in page components — so
 * this rail and the page's other sections stay disjoint by construction.
 */
export const buyShowcaseItems: ArtItem[] = (() => {
  const priced = [...saleGallery].reverse().filter((a) => a.price);
  const fallback = [...saleGallery].reverse();
  const picked = priced.length >= 3 ? priced : fallback;
  return picked.slice(0, 14);
})();

// Studio Contact, Brand and Social Links
const cur = currentContent();
/** Digits-only phone for wa.me deep links (prefilled-message support). */
const phoneDigits = cur.brand.phoneRaw.replace(/[^0-9]/g, '');
export const studioMeta = {
  name: cur.brand.name,
  founder: cur.brand.founder,
  tagline: cur.brand.tagline,
  subtitle: cur.brand.subtitle,
  whatsappUrl: cur.brand.whatsapp,
  whatsappNumber: cur.brand.phoneDisplay,
  /** Same artist number as the header WhatsApp, as a wa.me deep link. */
  whatsappWaMe: `https://wa.me/${phoneDigits}`,
  email: cur.brand.email,
  locationLabel: cur.brand.locationLabel,
  /** Google Maps place URL — header icon, contact section, chatbot directions. */
  mapsUrl: cur.brand.mapsUrl || '',
  facebookUrl: cur.social?.find((s) => s.network === 'facebook')?.url || 'https://www.facebook.com/profile.php?id=100063772818685',
  instagramUrl: cur.social?.find((s) => s.network === 'instagram')?.url || 'https://instagram.com/anugruja_arts',
  instagramSaleUrl: cur.social?.find((s) => s.network === 'instagram-sale')?.url || 'https://www.instagram.com/anugruja_painting4sale',
  youtubeUrl: cur.social?.find((s) => s.network === 'youtube')?.url || 'https://www.youtube.com/@anugrujaarts202',
  eventsUrl: 'https://posts.gle/SGYFWZ',
  /**
   * Developer credit shown at the end of every page ("want a site like this?").
   * Deliberately separate from the studio contact above — the phone number and
   * links here belong to the developer, NOT to the artist.
   */
  developerName: 'Abhay Kashyap',
  developerRole: 'Full stack Developer',
  developerAffiliation: 'UG BMSCE blr',
  developerGithub: 'https://github.com/abhay2008',
  developerLinkedin: 'https://www.linkedin.com/in/abhay-kashyap-54929a238/',
  developerPhone: '+91 7019289545',
  developerPhoneHref: 'tel:+917019289545',
};
