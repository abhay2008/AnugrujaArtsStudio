import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { commitBinaryFile, githubConfigured } from '@/lib/github';
import { cookieIsValid, COOKIE_NAME } from '@/lib/adminAuth';

const mimeToExt: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
};

export async function POST(req: NextRequest) {
  const cookieVal = req.cookies.get(COOKIE_NAME)?.value;
  const isAuth = await cookieIsValid(cookieVal);
  if (!isAuth) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  try {
    const { filename, data } = (await req.json()) as { filename?: string; data?: string };
    if (!data || typeof data !== 'string' || !data.startsWith('data:')) {
      return NextResponse.json({ error: 'Expected valid data URL payload' }, { status: 400 });
    }

    const match = data.match(/^data:([^;,]+)(?:;[^,]+)*;base64,(.+)$/s);
    if (!match) {
      return NextResponse.json({ error: 'Invalid data URL format' }, { status: 400 });
    }

    const mime = match[1].trim().toLowerCase();
    const rawExt = (filename?.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const ext = mimeToExt[mime] || rawExt || 'jpg';
    const buffer = Buffer.from(match[2].trim(), 'base64');

    const safeBase =
      (filename || 'artwork')
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .replace(/\.[^.]+$/, '')
        .slice(0, 40) || 'artwork';
    const unique = `${Date.now()}-${safeBase}.${ext}`;

    // Safely write to local public/images if available
    let localOk = false;
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'images');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uploadDir, unique), buffer);
      localOk = true;
    } catch (fsErr) {
      console.warn('Local file write skipped or failed (expected on serverless):', fsErr);
    }

    let commitResult = null;
    if (githubConfigured()) {
      try {
        commitResult = await commitBinaryFile(
          `public/images/${unique}`,
          buffer,
          `Upload artwork asset ${unique}`
        );
      } catch (ghErr) {
        console.warn('GitHub commit failed for uploaded asset:', ghErr);
      }
    } else if (!localOk) {
      return NextResponse.json(
        { error: 'Upload failed: local disk is read-only and GitHub is not configured' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: `/images/${unique}`,
      github: commitResult,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
