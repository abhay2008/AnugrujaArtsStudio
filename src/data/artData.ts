import initialSiteData from '../../content/site.json';
import type { SiteContent } from '@/lib/types';
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

// Dynamic accessor function for current galleries
export function getGalleryItems(key: keyof SiteContent['galleries']) {
  return currentContent().galleries[key] || [];
}

// Studio Contact, Brand and Social Links
const cur = currentContent();
export const studioMeta = {
  name: cur.brand.name,
  founder: cur.brand.founder,
  tagline: cur.brand.tagline,
  subtitle: cur.brand.subtitle,
  whatsappUrl: cur.brand.whatsapp,
  whatsappNumber: cur.brand.phoneDisplay,
  email: cur.brand.email,
  facebookUrl: cur.social?.find((s) => s.network === 'facebook')?.url || 'https://www.facebook.com/profile.php?id=100063772818685',
  instagramUrl: cur.social?.find((s) => s.network === 'instagram')?.url || 'https://instagram.com/anugruja_arts',
  instagramSaleUrl: cur.social?.find((s) => s.network === 'instagram-sale')?.url || 'https://www.instagram.com/anugruja_painting4sale',
  youtubeUrl: cur.social?.find((s) => s.network === 'youtube')?.url || 'https://www.youtube.com/@anugrujaarts202',
  eventsUrl: 'https://posts.gle/SGYFWZ',
  developerGithub: 'https://github.com/abhay2008',
  developerName: 'Abhay Kashyap',
};
