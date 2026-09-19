export type PaintingStatus = 'Available' | 'Reserved' | 'Sold';

export interface StudioPainting {
  id: string;
  title: string;
  medium: string;
  dimensions: string;
  /** Optional: prices live in content/site.json once an admin confirms them. */
  price?: string;
  status: PaintingStatus;
  image: string;
  fallbackImage: string;
  accentGlow: string;
}

export interface StudioPillar {
  id: string;
  title: string;
  description: string;
  tag: string;
  url: string;
}

export interface StudioEducation {
  degree: string;
  institution: string;
}

export interface StudioAchievement {
  year: string;
  title: string;
  institution: string;
  significance: string;
  /** Optional award certificate / ceremony photograph from the archive. */
  image?: string;
}

export interface StudioExhibition {
  name: string;
  location: string;
  year: string;
  /** International · National · Curated · Festival · Regional · State */
  type: string;
}

export interface StudioOutreach {
  label: string;
  detail: string;
}

export interface StudioChapter {
  num: string;
  tag: string;
  title: string;
  subtitle: string;
  body: string;
}

export interface StudioMetric {
  label: string;
  value: string;
}

/**
 * The editorial surface contract for the atelier.
 *
 * This deliberately lives outside the page components so an admin API or
 * dashboard can replace this object without changing the presentation layer.
 * `fallbackImage` keeps the first render resilient when a remote inventory
 * image is unavailable or an admin is working offline.
 *
 * Consumers
 * ─────────
 * hero · spotlight · featuredPaintings · pillars   → LandingHero / SpotlightPill / home rail
 * artist · journey                                 → ArtistJourneySection ("The Master's Journey")
 * achievements · exhibitions · outreach            → AccoladesSection ("Achievements & Honours")
 */
export const studioData = {
  hero: {
    overline: 'Fine Arts Studio & Academy',
    title: 'Anugruja Arts Studio',
    subtitle: 'Learn & Collect Original Fine Art',
    mantra: 'Discovering ourselves through colour and form',
  },

  artist: {
    name: 'Anuradha Govarthanan',
    title: 'Master Watercolorist & Atelier Founder',
    experience: '7+ Years of Studio Practice',
    origin: 'Chennai, Tamil Nadu',
    mantra: 'Discovering ourselves through colour and form',
    education: [
      {
        degree: 'Bachelor of Engineering (B.E.)',
        institution: 'Vellore Institute of Technology (VIT)',
      },
      {
        degree: 'Diploma in Fashion Design',
        institution: 'Hamstech Institute of Fashion Design, Hyderabad',
      },
    ] satisfies StudioEducation[],
    narrative: {
      prologue:
        'Born and raised in Chennai, Anuradha graduated in engineering from VIT before family life shifted her horizons. Longing to reignite childhood fires, she found sanctuary stealing away to her art room amidst domestic whirlwinds.',
      turningPoint:
        'Supported by family, she completed fashion design at Hamstech and ran her own boutique, yet fine art called relentlessly. When initial rejections mounted, she transformed watercolor — initially her fiercest adversary — into her greatest ally through ruthless discipline and realistic watercolor mastery.',
      atelierFounding:
        'From surviving critiques to receiving global acclaim from master artists, she established Anugruja Arts Studio. Today, she balances motherhood, studio mastery, and institutional mentorship worldwide.',
    },
  },

  /**
   * "The Master's Journey" — copy for the sticky scroll timeline. Chapters are
   * data, not markup, so the admin portal can retitle or extend the biography.
   */
  journey: {
    eyebrow: 'Biography & Studio Journey',
    heading: 'The Master’s Journey',
    metrics: [
      { label: 'Experience', value: '7+ Years of Studio Practice' },
      { label: 'Specialization', value: 'Realistic Watercolor' },
      { label: 'Atelier', value: 'Founder & Lead Mentor' },
    ] satisfies StudioMetric[],
    chapters: [
      {
        num: '01',
        tag: 'The Spark',
        title: 'The Engineering Mind & Creative Solitude',
        subtitle: 'Chennai Roots • VIT Engineering Graduate',
        body: 'Born and raised in Chennai, Anuradha graduated in engineering from VIT before family life shifted her horizons. Longing to reignite childhood fires, she found sanctuary stealing away to her art room amidst domestic whirlwinds.',
      },
      {
        num: '02',
        tag: 'The Crucible',
        title: 'The Adversary Becomes the Bestie',
        subtitle: 'Hamstech Fashion Alumna • Conquering Watercolor Realism',
        body: 'Supported by family, she completed fashion design at Hamstech and ran her own boutique, yet fine art called relentlessly. When initial rejections mounted, she transformed watercolor — initially her fiercest adversary — into her greatest ally through ruthless discipline and realistic watercolor mastery.',
      },
      {
        num: '03',
        tag: 'Mastery',
        title: 'Founding Anugruja Arts Studio',
        subtitle: '7+ Years of Studio Practice • Global Masterclasses',
        body: 'From surviving critiques to receiving global acclaim from master artists, she established Anugruja Arts Studio. Today, she balances motherhood, studio mastery, and institutional mentorship worldwide.',
      },
    ] satisfies StudioChapter[],
  },

  spotlight: {
    isActive: true,
    category: 'Upcoming Workshop',
    headline: 'Realistic Watercolor Mastery: Light & Glazing',
    dateBadge: 'Starts Oct 12',
    seatsRemaining: 4,
    /* Anchors to the "Workshops & Exhibitions" section on the home page. */
    actionUrl: '#workshops',
  },

  achievements: [
    {
      year: '2022',
      title: 'Best Paintings Award',
      institution: 'Kalakaar Foundation, New Delhi',
      significance:
        'National recognition for technical excellence in realistic watercolor.',
      image: '/images/achieve_1.jpeg',
    },
    {
      year: '2022',
      title: 'Sri PV Narasimha Rao Excellency Award',
      institution: 'Government / Cultural Forum',
      significance: 'Conferred for extraordinary lifelong contributions to fine arts.',
      image: '/images/achieve_3.jpeg',
    },
    {
      year: '2024',
      title: 'Finalist Award',
      institution: 'Teravana International Online Juried Exhibition',
      significance:
        'Global juried competition spanning international contemporary artists.',
    },
    {
      year: 'National',
      title: 'Golden Award',
      institution: 'Shiny Colours All-India Competition, Bangalore',
      significance: 'Top honor in master fine art category.',
      image: '/images/achieve_4.jpeg',
    },
  ] satisfies StudioAchievement[],

  exhibitions: [
    {
      name: 'Fabriano InAquarelle',
      location: 'Fabriano, Italy',
      year: '2021',
      type: 'International',
    },
    {
      name: 'Japan International Watercolor Institute',
      location: 'Tokyo, Japan',
      year: '2022',
      type: 'International',
    },
    {
      name: 'State Gallery of Arts',
      location: 'Hyderabad',
      year: 'Selected',
      type: 'Curated',
    },
    {
      name: 'Eshwaraiya Art Gallery',
      location: 'Hyderabad',
      year: 'Selected',
      type: 'Curated',
    },
    {
      name: 'Kalakaar National Showcase',
      location: 'New Delhi',
      year: 'Curated',
      type: 'National',
    },
    {
      name: 'State Art Gallery — “Ganesha”',
      location: 'Hyderabad',
      year: '2023',
      type: 'Curated',
    },
    {
      name: 'Hyderabad Art Festival',
      location: 'Hyderabad',
      year: '2023',
      type: 'Festival',
    },
    {
      name: 'Telangana Formation Day Showcase',
      location: 'Hyderabad',
      year: '2021',
      type: 'State',
    },
    {
      name: 'Tanu Nabunkar Exhibition',
      location: 'Siliguri',
      year: 'Curated',
      type: 'Regional',
    },
  ] satisfies StudioExhibition[],

  outreach: [
    {
      label: 'Diplomatic / Academic',
      detail:
        'Art workshop for International Foreign Exchange students at the University of Hyderabad (2019).',
    },
    {
      label: 'Corporate MNCs',
      detail:
        'Creative rejuvenation and fine art masterclasses for tech & corporate leaders across Hyderabad and Bangalore (Theme: Global Warming).',
    },
    {
      label: 'Governmental Heritage',
      detail:
        'Witnessed by the Cultural Minister during the Kashmir Residential Masterclass.',
    },
    {
      label: 'Community',
      detail:
        'Over 500+ mentored students spanning children, adults, and seniors — many now exhibiting in their own right.',
    },
  ] satisfies StudioOutreach[],

  featuredPaintings: [
    {
      id: 'art-01',
      title: 'Gilded Solitude',
      medium: 'Oil & 24k Gold Leaf on Belgian Linen',
      dimensions: '36 × 48 in',
      // No price: the live catalog is content/site.json, and prices may only
      // appear there once an admin confirms them. Seeded figures would leak
      // through any future consumer of this file.
      status: 'Available',
      image:
        'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1000&q=85',
      fallbackImage: '/images/p1.jpeg',
      accentGlow: 'rgba(212, 175, 55, 0.45)',
    },
    {
      id: 'art-02',
      title: 'Nocturne in Amethyst',
      medium: 'Layered Acrylic & Raw Mineral Pigments',
      dimensions: '40 × 40 in',
      status: 'Available',
      // The previous remote placeholder for this work was pulled by Unsplash
      // (hard 404), so it now points straight at the studio's own asset.
      image: '/images/p2.jpeg',
      fallbackImage: '/images/p2.jpeg',
      accentGlow: 'rgba(138, 43, 226, 0.45)',
    },
    {
      id: 'art-03',
      title: 'Whispers of the Atelier',
      medium: 'Classical Portrait Oil on Linen',
      dimensions: '30 × 42 in',
      status: 'Sold',
      image:
        'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=1000&q=85',
      fallbackImage: '/images/p3.jpeg',
      accentGlow: 'rgba(212, 175, 55, 0.45)',
    },
    {
      id: 'art-04',
      title: 'Vesper Veil',
      medium: 'Mixed Media, Resin & Bronze Dust',
      dimensions: '24 × 36 in',
      status: 'Available',
      image:
        'https://images.unsplash.com/photo-1582561424760-0321d75e81fa?auto=format&fit=crop&w=1000&q=85',
      fallbackImage: '/images/p4.jpeg',
      accentGlow: 'rgba(138, 43, 226, 0.45)',
    },
  ] satisfies StudioPainting[],

  pillars: [
    {
      id: 'classes',
      title: 'Academy & Classes',
      description:
        'Structured academic drawing, portraiture, and classical oil painting curricula.',
      tag: 'All Skill Levels',
      url: '/classes',
    },
    {
      id: 'workshops',
      title: 'Workshops & Events',
      description: 'Intensive weekend masterclasses and seasonal creative retreats.',
      tag: 'Upcoming: Oct 12',
      url: '/#workshops',
    },
    {
      id: 'gallery',
      title: 'Original Paintings',
      description: 'Curated original collection available for acquisition with provenance.',
      tag: 'Original Works',
      url: '/sale',
    },
  ] satisfies StudioPillar[],
} as const;

export type StudioData = typeof studioData;
