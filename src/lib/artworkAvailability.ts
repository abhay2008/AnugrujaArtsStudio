import type { ArtItem } from './types';

export function artworkAvailability(item: Pick<ArtItem, 'status'>): string {
  return item.status ?? 'Confirm availability';
}
