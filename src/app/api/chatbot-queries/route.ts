import { NextRequest } from 'next/server';
import { cookieIsValid, COOKIE_NAME } from '@/lib/adminAuth';
import { getLlmQueryStats } from '@/lib/chatbot/queryLog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Admin-only view of questions that fell through to the LLM.
 *
 * Purpose: FAQ mining — frequent LLM-bound questions are candidates for new
 * admin-curated FAQs; every promoted FAQ answers that question at zero
 * OpenRouter cost forever.
 */
export async function GET(req: NextRequest) {
  const cookieVal = req.cookies.get(COOKIE_NAME)?.value;
  const isAuth = await cookieIsValid(cookieVal);
  if (!isAuth) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hours = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get('hours') ?? '24', 10) || 24, 1), 168);
  const stats = getLlmQueryStats(hours);
  return Response.json(stats, { headers: { 'Cache-Control': 'no-store' } });
}
