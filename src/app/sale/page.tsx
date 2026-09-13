import { Metadata } from 'next';
import SaleClient from './SaleClient';

export const metadata: Metadata = {
  title: 'Art for Sale & Custom Commissions — Anugruja Arts Studio',
  description:
    'Browse original watercolor paintings, realism artworks, and request personalized fine arts portraits & custom murals by Master Artist Anuradha Govarthanan.',
};

export default function SalePage() {
  return <SaleClient />;
}
