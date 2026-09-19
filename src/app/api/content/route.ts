import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getSiteContentSync, writeSiteContentSync } from '@/lib/serverContent';
import { commitTextFile, getRemoteTextFile, githubConfigured } from '@/lib/github';
import { cookieIsValid, COOKIE_NAME } from '@/lib/adminAuth';
import { CHATBOT_CONTEXT_TAG, resetStudioContextCache } from '@/lib/chatbot/context';
import { resetRagIndex, contentRevisionHash } from '@/lib/chatbot/rag';
import { invalidateResponseCache } from '@/lib/chatbot/responseCache';
import { adoptFreshContent, resetFreshContent } from '@/lib/freshContent';
import type { SiteContent } from '@/lib/types';

/**
 * Prices the admin has not explicitly confirmed (no `priceConfirmedAt` stamp)
 * must never leave the server through this public endpoint — the site masks
 * them with XXXX, but a raw JSON dump would undo that. Signed-in console
 * sessions still get the raw content so the editors can do their job.
 */
function stripUnconfirmedPrices(content: SiteContent): SiteContent {
  try {
    const galleries = content.galleries as unknown as Record<string, unknown>;
    const cleaned = Object.fromEntries(
      Object.entries(galleries).map(([key, items]) => [
        key,
        Array.isArray(items)
          ? items.map((item) => {
              const art = item as { price?: unknown; priceConfirmedAt?: unknown };
              if (
                art &&
                typeof art === 'object' &&
                'price' in art &&
                art.price !== undefined &&
                art.price !== null &&
                String(art.price).trim() !== '' &&
                !art.priceConfirmedAt
              ) {
                return { ...art, price: '' };
              }
              return item;
            })
          : items,
      ])
    );
    return { ...content, galleries: cleaned } as unknown as SiteContent;
  } catch {
    return content;
  }
}

export async function GET(req: NextRequest) {
  // Signed-in console sessions may see raw (unconfirmed) prices; everyone
  // else gets the sanitized copy the public site is allowed to know.
  const authed = await cookieIsValid(req.cookies.get(COOKIE_NAME)?.value);

  // If GitHub is configured, try to pull latest committed content
  if (githubConfigured()) {
    try {
      const remoteText = await getRemoteTextFile('content/site.json');
      if (remoteText) {
        const parsed = JSON.parse(remoteText) as SiteContent;
        if (parsed && parsed.galleries) {
          return NextResponse.json(authed ? parsed : stripUnconfirmedPrices(parsed), {
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
  return NextResponse.json(authed ? local : stripUnconfirmedPrices(local), {
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
      // Drop the RAG chunk index and any cached chatbot replies so the
      // assistant picks up new paintings / prices / events on its very next
      // message — never answers from the previous catalog revision.
      resetRagIndex();
      invalidateResponseCache();
      // Adopt the just-published content immediately (no TTL wait), and let
      // the background GitHub probe adopt the committed version within a
      // minute — deploy or no deploy.
      adoptFreshContent(body);
      if (githubResult) resetFreshContent();
    } catch {}

    return NextResponse.json({
      ok: true,
      github: githubResult,
      localSaved: localOk,
      // Chatbot context revision after this publish — surfaced in the admin
      // portal so a human can see the AI assistant's knowledge move forward.
      revision: contentRevisionHash(getSiteContentSync()),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to update content';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
