import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getSiteContentSync, writeSiteContentSync } from '@/lib/serverContent';
import { commitTextFile, getRemoteTextFile, githubConfigured } from '@/lib/github';
import { cookieIsValid, COOKIE_NAME } from '@/lib/adminAuth';
import { CHATBOT_CONTEXT_TAG, resetStudioContextCache } from '@/lib/chatbot/context';
import type { SiteContent } from '@/lib/types';

export async function GET(req: NextRequest) {
  // If GitHub is configured, try to pull latest committed content
  if (githubConfigured()) {
    try {
      const remoteText = await getRemoteTextFile('content/site.json');
      if (remoteText) {
        const parsed = JSON.parse(remoteText) as SiteContent;
        if (parsed && parsed.galleries) {
          return NextResponse.json(parsed, {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            },
          });
        }
      }
    } catch (err) {
      console.warn('Could not fetch remote site.json from GitHub:', err);
    }
  }

  const local = getSiteContentSync();
  return NextResponse.json(local, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  });
}

export async function POST(req: NextRequest) {
  const cookieVal = req.cookies.get(COOKIE_NAME)?.value;
  const isAuth = await cookieIsValid(cookieVal);
  if (!isAuth) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as SiteContent;
    if (!body || !body.galleries) {
      return NextResponse.json({ error: 'Invalid site content structure' }, { status: 400 });
    }

    // Save locally
    let localOk = false;
    try {
      writeSiteContentSync(body);
      localOk = true;
    } catch (fsErr) {
      console.warn('Local disk write skipped or failed (expected on serverless):', fsErr);
    }

    // Commit to GitHub if configured
    let githubResult = null;
    if (githubConfigured()) {
      try {
        const serialized = JSON.stringify(body, null, 2) + '\n';
        githubResult = await commitTextFile(
          'content/site.json',
          serialized,
          'Update website galleries & content from Anugruja Admin Portal'
        );
      } catch (ghErr) {
        const msg = ghErr instanceof Error ? ghErr.message : 'GitHub commit failed';
        console.error('GitHub commit error:', ghErr);
        if (!localOk) {
          return NextResponse.json({ error: `GitHub commit failed: ${msg}` }, { status: 500 });
        }
      }
    }

    // Revalidate public static pages so changes appear immediately, and
    // drop the chatbot's cached context so the AI assistant knows about the
    // new paintings / prices / events on its very next message.
    try {
      revalidatePath('/', 'layout');
    } catch {}
    try {
      revalidateTag(CHATBOT_CONTEXT_TAG);
      resetStudioContextCache();
    } catch {}

    return NextResponse.json({
      ok: true,
      github: githubResult,
      localSaved: localOk,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to update content';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
