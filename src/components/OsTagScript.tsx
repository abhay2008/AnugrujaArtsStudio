import { OS_TAG_VALUE_SCRIPT } from '@/lib/osTier';

/**
 * Stamps `data-os="windows|other"` on <html> before the first paint so the
 * Windows compositing fallbacks in globals.css are correct from the very
 * first frame — no flash of blank gradient headlines or torn carousel layers.
 *
 * Must stay in <head>, before any stylesheet-dependent paint.
 */
export default function OsTagScript() {
  return <script dangerouslySetInnerHTML={{ __html: OS_TAG_VALUE_SCRIPT }} />;
}
