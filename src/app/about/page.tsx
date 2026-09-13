import { Metadata } from 'next';
import AboutArtistClient from './AboutArtistClient';

export const metadata: Metadata = {
  title: 'About Us — Anuradha Govarthanan | Anugruja Arts Studio',
  description:
    'Learn about Anuradha Govarthanan, professional artist and founder of Anugruja Arts Studio. Discover her awards, exhibitions, and masterclasses.',
};

export default function AboutPage() {
  return <AboutArtistClient />;
}
