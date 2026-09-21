'use client';

import { useEffect } from 'react';
import { armTierProbe } from '@/lib/perfTier';

/**
 * Arms the runtime frame-time probe (see `armTierProbe`), which demotes a
 * struggling device to the `lite` tier mid-session.
 *
 * This exists because the pre-paint tier script can only read
 * `navigator.deviceMemory` / `navigator.connection`, neither of which exists in
 * Safari or Firefox — the engines a lot of older phones run. Mounting it here
 * (once, in the public site layout) means it covers every public route without
 * any component having to know about it.
 *
 * Renders nothing and costs one effect.
 */
export default function TierProbe() {
  useEffect(() => armTierProbe(), []);
  return null;
}
