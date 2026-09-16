/**
 * Registry of the CMS-backed blocks the live-preview editor can open.
 *
 * Mirrors Jeeva Art School's section editor: every entry maps to a slice of
 * `content/site.json`, is rendered inside an <EditableSection> in the preview
 * pane, and gets its own field group in the editor panel.
 */
export type PreviewSectionId =
  | 'banner'
  | 'featured'
  | 'buy-paintings'
  | 'aboutArtist'
  | 'courses'
  | 'quicknav'
  | 'brand';

export interface PreviewSectionMeta {
  id: PreviewSectionId;
  label: string;
  /** One-line reminder of what the block controls. */
  hint: string;
  /** 'fields' → text/media fields; 'gallery' → artwork rows; 'list' → listing rows. */
  kind: 'fields' | 'gallery' | 'list';
  gallery?: 'featured' | 'sale';
}

export const PREVIEW_SECTIONS: PreviewSectionMeta[] = [
  {
    id: 'banner',
    label: 'Hero Banner',
    hint: 'Emblem, headline, badge and opening quote above the fold.',
    kind: 'fields',
  },
  {
    id: 'featured',
    label: 'Featured Gallery',
    hint: 'Home spotlight rail — galleries.featured.',
    kind: 'gallery',
    gallery: 'featured',
  },
  {
    id: 'buy-paintings',
    label: 'Buy Paintings',
    hint: 'Sale catalogue rail — galleries.sale.',
    kind: 'gallery',
    gallery: 'sale',
  },
  {
    id: 'aboutArtist',
    label: 'About the Artist',
    hint: 'Portrait, headline and biography lead.',
    kind: 'fields',
  },
  {
    id: 'courses',
    label: 'Courses & Classes',
    hint: 'Title and lead copy for the classes block.',
    kind: 'fields',
  },
  {
    id: 'quicknav',
    label: 'Quick Nav Shortcuts',
    hint: 'Sticky shortcut chips on the home page.',
    kind: 'list',
  },
  {
    id: 'brand',
    label: 'Brand & Footer',
    hint: 'Studio name, tagline, founder and contact lines.',
    kind: 'fields',
  },
];

export function findPreviewSection(id: string | null): PreviewSectionMeta | undefined {
  return PREVIEW_SECTIONS.find((section) => section.id === id);
}
