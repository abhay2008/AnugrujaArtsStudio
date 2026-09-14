export interface ArtItem {
  id: string;
  src: string;
  title: string;
  category?: string;
  aspect?: string;
  price?: number | string;
  description?: string;
  medium?: string;
  dateAdded?: string;
  /** Acquisition status surfaced as a badge on the card. */
  status?: 'Available' | 'Reserved' | 'Sold';
  /** Halo colour rendered behind the active plate in the 3D showcase. */
  accentGlow?: string;
  dimensions?: string;
}

/**
 * Metadata for the home-page scroll shortcut chips ("Buy Paintings",
 * "Courses", etc.) so they can be managed like any other content.
 */
export interface PageListing {
  id: string;
  /** lucide icon key understood by QuickNav (palette, tag, graduation, user) */
  icon: string;
  label: string;
  /** target hash on the home page, e.g. "/#buy-paintings" */
  href: string;
  title: string;
  subtitle: string;
}

export interface SocialLink {
  network: string;
  url: string;
  color?: string;
}

export interface SiteBrand {
  name: string;
  tagline: string;
  subtitle: string;
  founder: string;
  phoneDisplay: string;
  phoneRaw: string;
  whatsapp: string;
  email: string;
  locationLabel: string;
}

export interface SiteMeta {
  title: string;
  description: string;
  favicon: string;
}

export interface SiteGalleries {
  featured: ArtItem[];
  workshop: ArtItem[];
  testimonial: ArtItem[];
  achievement: ArtItem[];
  classes: ArtItem[];
  watercolor: ArtItem[];
  sale: ArtItem[];
  commission: ArtItem[];
}

export interface SiteSections {
  banner: {
    title: string;
    subtitle: string;
    quote: string;
    badge: string;
    bgImage: string;
    logo: string;
  };
  aboutArtist: {
    portraitImage: string;
    portraitAlt: string;
    headline: string;
    subheading: string;
  };
  courses: {
    title: string;
    subtitle: string;
  };
  pageMeta?: {
    quickNav?: PageListing[];
  };
}

export interface SiteContent {
  meta: SiteMeta;
  brand: SiteBrand;
  social: SocialLink[];
  galleries: SiteGalleries;
  sections: SiteSections;
}

export type GalleryKey = keyof SiteGalleries;

export const GALLERY_DEFINITIONS: {
  key: GalleryKey;
  label: string;
  description: string;
  defaultCategory: string;
}[] = [
  { key: 'featured', label: 'Featured Gallery (Home)', description: 'Spotlight gallery #one on the main landing page', defaultCategory: 'Featured Collection' },
  { key: 'sale', label: 'Art for Sale', description: 'Paintings catalog available for direct purchase & inquiries', defaultCategory: 'Paintings for Sale' },
  { key: 'commission', label: 'Commissioned Works', description: 'Showcase of custom portraits, deities & murals', defaultCategory: 'Custom Commission' },
  { key: 'classes', label: 'Classes & Courses', description: 'Student artworks and teaching milestone demonstrations', defaultCategory: 'Student Work' },
  { key: 'watercolor', label: 'Watercolor Courses', description: 'Masterclass and watercolor studies', defaultCategory: 'Watercolor Study' },
  { key: 'workshop', label: 'Workshops & Exhibitions', description: 'Spotlight #two: Corporate workshops & gallery exhibitions', defaultCategory: 'Exhibition' },
  { key: 'testimonial', label: 'Testimonials & Student Success', description: 'Spotlight #three: Works produced by proud students', defaultCategory: 'Student Work' },
  { key: 'achievement', label: 'Achievements & Awards', description: 'Kalakaar Foundation, State Gallery & Shiny Colours awards', defaultCategory: 'Award Highlight' },
];
