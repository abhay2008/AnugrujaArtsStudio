'use client';

import dynamic from 'next/dynamic';
import { useLightbox } from '@/components/LightboxContext';
import BodyPortal from '@/components/BodyPortal';

/**
 * The gallery lightbox is a big, zoom-capable component that most visitors
 * never open. It used to sit in every page's initial JavaScript; now its chunk
 * is fetched the first time somebody actually enlarges a painting.
 *
 * `LightboxModal` renders `null` unless a slide is active, so gating the mount
 * on `activeImage` changes nothing about how it behaves — it simply is not
 * parsed until it is needed.
 *
 * It is portalled to <body>: the modal is `fixed inset-0`, and inside the
 * route wrapper (or any transformed/contained ancestor) that resolves against
 * the page box instead of the viewport — a 9,000px-tall "fullscreen" layer
 * whose top bar, image and caption all sit off screen.
 */
const LightboxModal = dynamic(() => import('@/components/LightboxModal'), { ssr: false });

export default function DeferredLightbox() {
  const { activeImage } = useLightbox();

  if (!activeImage) return null;

  return (
    <BodyPortal>
      <LightboxModal />
    </BodyPortal>
  );
}
