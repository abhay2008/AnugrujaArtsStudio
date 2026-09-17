/**
 * Resolve/load hooks so the repo's TypeScript suites run on plain Node — no
 * tsx install. Teaches Node the two things it would otherwise get from
 * tsconfig: the `@/` path alias and extensionless imports, plus JSON imports
 * without an import attribute (`content/site.json`).
 *
 * Registered by `scripts/ts-node-boot.mjs`; used by the `test:chat` and
 * `test:e2e` npm scripts. Requires Node 23+ (built-in type stripping).
 */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const SUFFIXES = ['.ts', '.tsx', '/index.ts', '/index.tsx', '.js', '.mjs'];

export async function resolve(specifier, context, next) {
  let spec = specifier;
  if (spec.startsWith('@/')) {
    spec = pathToFileURL(path.join(ROOT, 'src', spec.slice(2))).href;
  } else if ((spec.startsWith('./') || spec.startsWith('../')) && context.parentURL) {
    spec = new URL(spec, context.parentURL).href;
  }

  if (spec.startsWith('file:') && !path.extname(new URL(spec).pathname)) {
    for (const suffix of SUFFIXES) {
      const candidate = spec + suffix;
      if (existsSync(new URL(candidate))) return { url: candidate, shortCircuit: true };
    }
  }
  return next(spec, context);
}

/** Bundlers allow `import data from './x.json'`; Node wants an import attribute. */
export async function load(url, context, next) {
  if (url.endsWith('.json')) {
    return { format: 'json', source: await readFile(new URL(url), 'utf8'), shortCircuit: true };
  }
  return next(url, context);
}
