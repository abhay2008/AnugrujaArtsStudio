import initialSiteData from '../../content/site.json';
import type {
  SiteContent,
  AboutArtistSection,
  MasterJourneyData,
  StudioMetric,
  StudioEducation,
  StudioChapter,
} from './types';

/**
 * Access the parsed content from content/site.json.
 */
export function getSiteContent(): SiteContent {
  return initialSiteData as unknown as SiteContent;
}

/**
 * Returns dynamic Master Artist Profile data with fallbacks.
 */
export function getArtistProfile() {
  const content = getSiteContent();
  const about = content.sections?.aboutArtist;
  const brand = content.brand;

  return {
    name: about?.name || brand?.founder || 'Anuradha Govarthanan',
    title: about?.title || 'Master Watercolorist & Atelier Founder',
    role: about?.role || 'Master Artist & Founder',
    mantra: about?.mantra || 'Discovering ourselves through colour and form',
    headline: about?.headline || 'Anuradha Govarthanan — A Professional Artist',
    subheading: about?.subheading || 'Water Colour Paintings and Realistic Artwork',
    portraitImage: about?.portraitImage || '/images/image.png',
    portraitAlt: about?.portraitAlt || `${about?.name || 'Anuradha Govarthanan'} Portrait`,
    origin: about?.origin || 'Chennai, Tamil Nadu',
    experience: about?.experience || '7+ Years of Studio Practice',
    education: (about?.education && about.education.length > 0)
      ? about.education
      : [
          {
            degree: 'Bachelor of Engineering (B.E.)',
            institution: 'Vellore Institute of Technology (VIT)',
          },
          {
            degree: 'Diploma in Fashion Design',
            institution: 'Hamstech Institute of Fashion Design, Hyderabad',
          },
        ],
    metrics: (about?.metrics && about.metrics.length > 0)
      ? about.metrics
      : [
          { label: 'Experience', value: '7+ Years of Studio Practice' },
          { label: 'Specialization', value: 'Realistic Watercolor' },
          { label: 'Atelier', value: 'Founder & Lead Mentor' },
        ],
  };
}

/**
 * Returns dynamic Master's Journey chapters and narrative data.
 */
export function getJourneyContent(): MasterJourneyData & { chapters: StudioChapter[] } {
  const content = getSiteContent();
  const journey = content.sections?.aboutArtist?.journey;

  return {
    eyebrow: journey?.eyebrow || 'Biography & Studio Journey',
    heading: journey?.heading || 'The Master’s Journey',
    metrics: getArtistProfile().metrics,
    chapters: (journey?.chapters && journey.chapters.length > 0)
      ? journey.chapters
      : [
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
        ],
  };
}

export * from './types';
