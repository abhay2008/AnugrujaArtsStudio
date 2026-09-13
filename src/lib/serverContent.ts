import fs from 'fs';
import path from 'path';
import type { SiteContent } from './types';
import fallbackContent from '../../content/site.json';

const contentFilePath = path.join(process.cwd(), 'content', 'site.json');

export function getSiteContentSync(): SiteContent {
  try {
    if (fs.existsSync(contentFilePath)) {
      const raw = fs.readFileSync(contentFilePath, 'utf8');
      return JSON.parse(raw) as SiteContent;
    }
  } catch (err) {
    console.warn('Could not read site.json from disk, using fallbackContent:', err);
  }
  return fallbackContent as unknown as SiteContent;
}

export function writeSiteContentSync(content: SiteContent): void {
  const dir = path.dirname(contentFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(contentFilePath, JSON.stringify(content, null, 2) + '\n', 'utf8');
}
