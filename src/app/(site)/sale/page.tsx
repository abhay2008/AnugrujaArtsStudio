import { Metadata } from 'next';
import SaleClient from './SaleClient';

export const metadata: Metadata = {
  title: 'Original Watercolor Paintings for Sale & Commissions',
  alternates: { canonical: '/sale' },
  openGraph: {
    title: 'Original Watercolor Paintings for Sale & Commissions',
    description: 'Browse original watercolor paintings and commission a custom portrait, mural, or fine art piece from Anuradha Govarthanan.',
    url: '/sale',
    images: [{ url: '/images/p1.jpeg', alt: 'Original watercolor painting from Anugruja Arts Studio' }],
  },
  twitter: { card: 'summary_large_image', images: ['/images/p1.jpeg'] },
  description:
    'Browse original watercolor paintings, realism artworks, and request personalized fine arts portraits & custom murals by Master Artist Anuradha Govarthanan.',
};

export default function SalePage() {
  return <SaleClient />;
}
