'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders viewport-anchored UI (lightbox, chat launcher) as a direct child of
 * <body>.
 *
 * A `position: fixed` element is positioned against the viewport only while no
 * ancestor establishes a containing block for it — and `transform`,
 * `translate`, `filter`, `perspective`, `will-change: transform`,
 * `contain: layout|paint` and `content-visibility` all do. The route
 * transition wrapper in `app/template.tsx`, the `.reveal` wrappers and the
 * contained sections are all such ancestors. Portalling to <body> makes the
 * fixed layer immune to whatever the page tree does now or later.
 *
 * React context still flows through the portal, so consumers keep working.
 */
export default function BodyPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return mounted ? createPortal(children, document.body) : null;
}
