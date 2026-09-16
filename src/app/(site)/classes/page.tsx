import { Metadata } from 'next';
import ClassesClient from './ClassesClient';

export const metadata: Metadata = {
  title: 'Classes & Courses — Anugruja Arts Studio',
  description:
    'Online & offline fine arts courses, watercolor masterclasses, diploma training, and sketching fundamentals with Master Artist Anuradha Govarthanan.',
};

export default function ClassesPage() {
  return <ClassesClient />;
}
