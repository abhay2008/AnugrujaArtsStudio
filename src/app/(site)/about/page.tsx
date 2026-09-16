import { Metadata } from 'next';
import AboutArtistClient from './AboutArtistClient';

export const metadata: Metadata = {
  title: 'About Anuradha Govarthanan, Master Watercolor Artist',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About Anuradha Govarthanan, Master Watercolor Artist',
    description: 'Meet Anuradha Govarthanan, founder of Anugruja Arts Studio, known for realistic watercolor art, teaching, exhibitions, and workshops.',
    url: '/about',
    images: [{ url: '/images/image.png', alt: 'Portrait of Anuradha Govarthanan' }],
  },
  twitter: { card: 'summary_large_image', images: ['/images/image.png'] },
  description:
    'Learn about Anuradha Govarthanan, professional artist and founder of Anugruja Arts Studio. Discover her awards, exhibitions, and masterclasses.',
};

export default function AboutPage() {
  return <AboutArtistClient />;
}
