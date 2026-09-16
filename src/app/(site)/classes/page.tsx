import { Metadata } from 'next';
import ClassesClient from './ClassesClient';

export const metadata: Metadata = {
  title: 'Watercolor Classes & Fine Arts Courses',
  alternates: { canonical: '/classes' },
  openGraph: {
    title: 'Watercolor Classes & Fine Arts Courses',
    description: 'Join online or in-person watercolor and fine arts classes for children, adults, and serious learners with Anuradha Govarthanan.',
    url: '/classes',
    images: [{ url: '/images/cl5.jpeg', alt: 'Fine arts class at Anugruja Arts Studio' }],
  },
  twitter: { card: 'summary_large_image', images: ['/images/cl5.jpeg'] },
  description:
    'Online & offline fine arts courses, watercolor masterclasses, diploma training, and sketching fundamentals with Master Artist Anuradha Govarthanan.',
};

export default function ClassesPage() {
  return <ClassesClient />;
}
