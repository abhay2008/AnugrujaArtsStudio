'use client';

import dynamic from 'next/dynamic';
import { useLightbox } from '@/components/LightboxContext';

/**
 * The gallery lightbox is a big, zoom-capable component that most visitors
 * never open. It used to sit in every page's initial JavaScript; now its chunk
 * is fetched the first time somebody actually enlarges a painting.
 *
 * `LightboxModal` renders `null` unless a slide is active, so gating the mount
 * on `activeImage` changes nothing about how it behaves — it simply is not
 * parsed until it is needed.
 */
const LightboxModal = dynamic(() => import('@/components/LightboxModal'), { ssr: false });

export default function DeferredLightbox() {
  const { activeImage } = useLightbox();

  if (!activeImage) return null;

  return <LightboxModal />;
}
