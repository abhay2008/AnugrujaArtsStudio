import { NextResponse } from 'next/server';
import { githubConfigured, githubRepoUrl, latestCommit } from '@/lib/github';

export async function GET() {
  const configured = githubConfigured();
  const repoUrl = githubRepoUrl();
  let latest = null;

  if (configured) {
    try {
      latest = await latestCommit();
    } catch {}
  }

  return NextResponse.json(
    {
      configured,
      repoUrl,
      latest,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
