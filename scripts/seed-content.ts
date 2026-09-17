import fs from 'fs';
import path from 'path';
import {
  featuredGallery,
  workshopGallery,
  testimonialGallery,
  achievementGallery,
  classGallery,
  watercolorGallery,
  saleGallery,
  commissionGallery,
  studioMeta,
} from '../src/data/artData';

const initialContent = {
  meta: {
    title: 'Anugruja Arts Studio — Anuradha Govarthanan',
    description: 'Commercial web platform and fine arts portfolio for Anugruja Arts Studio, featuring original watercolor paintings, fine arts diploma courses, workshops, and custom art commissions.',
    favicon: '/images/logo.png',
  },
  brand: {
    name: 'Anugruja Arts Studio',
    tagline: 'Discover ourselves through colors',
    subtitle: 'Learn and buy art!',
    founder: 'Anuradha Govarthanan',
    phoneDisplay: '+91 96112 55949',
    phoneRaw: '919611255949',
    whatsapp: 'https://wa.link/ghtuox',
    email: 'anugruja@gmail.com',
    locationLabel: 'Hyderabad, Telangana',
    mapsUrl:
      'https://www.google.com/maps/place/Anugruja+Arts+Studio+-+by+Anuradha+Govarthanan/@17.4714592,78.3050879,15.31z/data=!4m6!3m5!1s0x3bcb932ff5c06875:0x2ba4955525eedcff!8m2!3d17.4735308!4d78.3136112!16s%2Fg%2F11vz46_mc0',
  },
  social: [
    { network: 'whatsapp', url: studioMeta.whatsappUrl, color: 'green' },
    { network: 'facebook', url: studioMeta.facebookUrl, color: 'blue' },
    { network: 'instagram', url: studioMeta.instagramUrl, color: 'violet' },
    { network: 'instagram-sale', url: studioMeta.instagramSaleUrl, color: 'amber' },
    { network: 'youtube', url: studioMeta.youtubeUrl, color: 'red' },
  ],
  galleries: {
    featured: featuredGallery,
    workshop: workshopGallery,
    testimonial: testimonialGallery,
    achievement: achievementGallery,
    classes: classGallery,
    watercolor: watercolorGallery,
    sale: saleGallery,
    commission: commissionGallery,
  },
  sections: {
    banner: {
      title: 'Anugruja Arts Studio',
      subtitle: 'Learn and buy art!',
      quote: '"Discover ourselves through colors"',
      badge: 'Fine Arts Studio & Master Academy',
      bgImage: '/images/banner.jpeg',
      logo: '/images/logo.png',
    },
    aboutArtist: {
      portraitImage: '/images/image.png',
      portraitAlt: 'Anuradha Govarthanan Portrait',
      headline: 'Anuradha Govarthanan — A Professional Artist',
      subheading: 'Water Colour Paintings and Realistic Artwork',
    },
    courses: {
      title: 'Classes & Courses',
      subtitle: 'Online-Offline, Watercolour & Comprehensive Fine Arts Courses',
    },
  },
};

const targetDir = path.join(process.cwd(), 'content');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

fs.writeFileSync(
  path.join(targetDir, 'site.json'),
  JSON.stringify(initialContent, null, 2) + '\n',
  'utf8'
);

console.log('Successfully generated content/site.json with', Object.keys(initialContent.galleries).length, 'galleries.');
