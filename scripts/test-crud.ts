import { getSiteContentSync, writeSiteContentSync } from '../src/lib/serverContent';
import type { SiteContent } from '../src/lib/types';

async function testCrud() {
  console.log('--- Testing Content CRUD & Persistence ---');
  const initial = getSiteContentSync();
  console.log('Initial brand name:', initial.brand.name);
  if (initial.brand.name !== 'Anugruja Arts Studio') {
    throw new Error('Unexpected initial brand name');
  }

  const initialSaleCount = initial.galleries.sale.length;
  console.log('Initial sale artworks count:', initialSaleCount);

  // Add dummy test artwork
  const testItem = {
    id: 'test-art-1',
    src: '/images/test.jpg',
    title: 'Test Verification Painting',
    category: 'Paintings for Sale',
    price: '₹5,000',
  };

  const modified: SiteContent = {
    ...initial,
    galleries: {
      ...initial.galleries,
      sale: [testItem, ...initial.galleries.sale],
    },
  };

  writeSiteContentSync(modified);
  const reloaded = getSiteContentSync();
  if (reloaded.galleries.sale.length !== initialSaleCount + 1) {
    throw new Error('Failed to append test artwork to sale gallery');
  }
  if (reloaded.galleries.sale[0].id !== 'test-art-1') {
    throw new Error('Appended artwork is not in first position');
  }
  console.log('Successfully added and verified artwork persistence.');

  // Clean up and restore
  writeSiteContentSync(initial);
  const restored = getSiteContentSync();
  if (restored.galleries.sale.length !== initialSaleCount) {
    throw new Error('Failed to restore initial state');
  }
  console.log('Successfully restored clean site content.');
  console.log('✅ CRUD tests PASSED!\n');
}

testCrud().catch((e) => {
  console.error('❌ Test failed:', e);
  process.exit(1);
});
