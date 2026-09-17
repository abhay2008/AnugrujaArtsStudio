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
 * The catalog map: what each gallery *is*, and what data it needs.
 *
 * This drives the admin UX (upload forms, edit forms, badges, validation)
 * and the chatbot's understanding of the catalog. `sellable` galleries are
 * commercial: paintings a visitor can buy, so price + acquisition status
 * apply. Non-sellable galleries are showcase/curation (student work, awards,
 * workshops): price/status fields are hidden and never fabricated, and the
 * public site renders no availability badge on them.
 */
export interface GalleryCatalogEntry {
  key: GalleryKey;
  /** Admin-facing label (used in dropdowns). */
  label: string;
  /** One line the admin sees under the dropdown option. */
  purpose: string;
  /** Can visitors buy items in this collection? Drives price/status fields. */
  sellable: boolean;
  /** Where new uploads naturally belong — used to pre-fill smart defaults. */
  suggestedForUploads: boolean;
  /** Suggested category value when the admin hasn't overridden it. */
  defaultCategory: string;
  /** Concrete filename keyword hints for auto-mapping (e.g. "krishna" → sale). */
  filenameHints: string[];
  /** Sale-page placement hint for the chatbot's catalog overview. */
  chatbotNote: string;
}

export const GALLERY_CATALOG: GalleryCatalogEntry[] = [
  {
    key: 'sale',
    label: 'Art for Sale',
    purpose: 'Paintings visitors can buy — shown on the Sale page with prices.',
    sellable: true,
    suggestedForUploads: true,
    defaultCategory: 'Paintings for Sale',
    filenameHints: ['sale', 'p1', 'p2', 'p3', 'buy', 'shop'],
    chatbotNote: 'Live purchase catalog with prices and availability.',
  },
  {
    key: 'featured',
    label: 'Featured Portfolio',
    purpose: 'Masterpieces spotlighted on the home page carousel.',
    sellable: false,
    suggestedForUploads: false,
    defaultCategory: 'Featured Collection',
    filenameHints: ['featured', 'g1', 'g2', 'hero', 'portfolio'],
    chatbotNote: 'Home-page showcase — pieces the studio is proud of.',
  },
  {
    key: 'commission',
    label: 'Commissioned Works',
    purpose: 'Custom portraits & murals already delivered — sold but showcased.',
    sellable: false,
    suggestedForUploads: false,
    defaultCategory: 'Custom Commission',
    filenameHints: ['commission', 'c1', 'custom', 'portrait', 'mural'],
    chatbotNote: 'Custom work already delivered — visitors can order similar.',
  },
  {
    key: 'classes',
    label: 'Classes & Courses',
    purpose: 'Student artworks and teaching milestones — not for sale.',
    sellable: false,
    suggestedForUploads: false,
    defaultCategory: 'Student Work',
    filenameHints: ['class', 'student', 'cl0', 'academy', 'diploma'],
    chatbotNote: 'Teaching results — visitors can join the classes.',
  },
  {
    key: 'watercolor',
    label: 'Watercolor Courses',
    purpose: 'Masterclass and watercolor course samples — not for sale.',
    sellable: false,
    suggestedForUploads: false,
    defaultCategory: 'Watercolor Study',
    filenameHints: ['watercolor', 'wt1', 'wt', 'masterclass'],
    chatbotNote: 'Watercolor course showcase — visitors can enroll.',
  },
  {
    key: 'workshop',
    label: 'Workshops & Exhibitions',
    purpose: 'Corporate workshops, plein-air camps and exhibition photos.',
    sellable: false,
    suggestedForUploads: false,
    defaultCategory: 'Exhibition',
    filenameHints: ['workshop', 'w1', 'exhibition', 'camp', 'event'],
    chatbotNote: 'Workshop & exhibition gallery — visitors can book sessions.',
  },
  {
    key: 'testimonial',
    label: 'Testimonials & Reviews',
    purpose: 'Student success stories and appreciation letters.',
    sellable: false,
    suggestedForUploads: false,
    defaultCategory: 'Student Work',
    filenameHints: ['testimonial', 't1', 'review', 'letter'],
    chatbotNote: 'Social proof — stories from students and collectors.',
  },
  {
    key: 'achievement',
    label: 'Achievements & Awards',
    purpose: 'Awards, foundation recognitions and press mentions.',
    sellable: false,
    suggestedForUploads: false,
    defaultCategory: 'Award Highlight',
    filenameHints: ['achieve', 'a1', 'award', 'press'],
    chatbotNote: 'Studio recognition — awards and honors.',
  },
];

export function galleryCatalogEntry(key: GalleryKey): GalleryCatalogEntry {
  return (
    GALLERY_CATALOG.find((g) => g.key === key) ?? GALLERY_CATALOG[0]
  );
}

/**
 * Guess the destination gallery from an artwork filename.
 * Checks each catalog entry's filenameHints against the name; the first
 * (longest) match wins so "watercolor-masterclass-3" maps to watercolor,
 * not workshop. Returns null when nothing matches — the caller then uses
 * the batch default.
 */
export function suggestGalleryFromFilename(filename: string): GalleryKey | null {
  const name = filename.toLowerCase();
  let best: { key: GalleryKey; len: number } | null = null;
  for (const entry of GALLERY_CATALOG) {
    for (const hint of entry.filenameHints) {
      if (name.includes(hint) && (!best || hint.length > best.len)) {
        best = { key: entry.key, len: hint.length };
      }
    }
  }
  return best?.key ?? null;
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
  /** Google Maps place URL for the studio (header icon, contact, chatbot). */
  mapsUrl?: string;
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

/** One entry in the studio's structured event calendar (CMS-managed). */
export interface StudioEvent {
  id: string;
  title: string;
  /** Free-form date as displayed, e.g. "Oct 12, 2026" or "Every Saturday". */
  date: string;
  /** ISO hint (e.g. "2026-10-12") so the bot can reason about upcoming vs past. */
  dateIso?: string;
  location?: string;
  description?: string;
  registrationUrl?: string;
  /** Registration deadline shown as editorial copy, e.g. "Closes Oct 5". */
  registrationDeadline?: string;
  /** Optional label such as Workshop, Exhibition, Retreat or Masterclass. */
  eventType?: string;
  /** Optional capacity hint surfaced on the registration card. */
  seatsRemaining?: number;
  /** Legacy single-image field retained for existing entries. */
  image?: string;
  /** Promotional images shown in the upcoming-event gallery. */
  images?: string[];
  /** Only for past events — how it went, attendance, highlights. */
  outcome?: string;
}

export interface StudioEvents {
  upcoming: StudioEvent[];
  past: StudioEvent[];
}

export interface ChatbotFaq {
  question: string;
  answer: string;
}

/** Admin-managed configuration for the site-wide AI chat assistant. */
export interface ChatbotConfig {
  enabled: boolean;
  welcomeMessage: string;
  suggestedPrompts: string[];
  /** Extra business knowledge the bot may quote verbatim. */
  faqs: ChatbotFaq[];
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
  /** Structured event calendar shown on the site and known to the chatbot. */
  events?: StudioEvents;
  /** Site-wide AI chat assistant configuration & extra knowledge. */
  chatbot?: ChatbotConfig;
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
