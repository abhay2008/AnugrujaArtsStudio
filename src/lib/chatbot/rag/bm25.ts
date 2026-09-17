/**
 * Dependency-free BM25 lexical scoring for the chatbot RAG retriever.
 *
 * The corpus is tiny (~100–200 chunks derived from content/site.json), so a
 * plain in-memory inverted index beats any embedding pipeline here: sub-
 * millisecond scoring, no external API, no re-embedding on cold start, and
 * studio queries ("painting 12 price", "Kashmir workshop", "class fees") are
 * exactly the keyword-heavy style lexical search handles best.
 *
 * Reference: Robertson & Zobel, "The BM25 weighting scheme".
 */

/** A chunk reduced to its token stream plus shared corpus statistics. */
export interface Bm25Doc {
  tokens: string[];
  length: number;
}

export interface Bm25Index {
  docs: Bm25Doc[];
  /** document frequency per term */
  df: Map<string, number>;
  /** total token count across the corpus */
  totalLength: number;
  /** number of documents */
  n: number;
}

// Tuned for a tiny, homogeneous corpus of short studio chunks.
const K1 = 1.5;
const B = 0.75;

/** Build the shared corpus statistics used for scoring. */
export function buildBm25Index(tokenMatrix: string[][]): Bm25Index {
  const df = new Map<string, number>();
  let totalLength = 0;
  for (const tokens of tokenMatrix) {
    totalLength += tokens.length;
    const seen = new Set(tokens);
    for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1);
  }
  return { docs: tokenMatrix.map((tokens) => ({ tokens, length: tokens.length })), df, totalLength, n: tokenMatrix.length };
}

/**
 * BM25 score of one document against tokenized query terms.
 * Returns 0 when there is no lexical overlap.
 */
export function bm25Score(qTokens: string[], doc: Bm25Doc | string[], index: Bm25Index): number {
  const d: Bm25Doc = Array.isArray(doc) ? { tokens: doc, length: doc.length } : doc;
  if (qTokens.length === 0 || d.length === 0 || index.n === 0) return 0;

  const avgLen = index.totalLength / index.n;
  const termFreqs = new Map<string, number>();
  for (const t of d.tokens) termFreqs.set(t, (termFreqs.get(t) ?? 0) + 1);

  let score = 0;
  for (const term of qTokens) {
    const tf = termFreqs.get(term);
    if (!tf) continue;
    const df = index.df.get(term) ?? 0;
    const idf = Math.log(1 + (index.n - df + 0.5) / (df + 0.5));
    const tfNorm = (tf * (K1 + 1)) / (tf + K1 * (1 - B + B * (d.length / avgLen)));
    score += idf * tfNorm;
  }
  return score;
}

/**
 * Tokenizer shared by indexing and querying.
 * Lowercases, strips punctuation (Unicode-aware), keeps tokens ≥2 chars,
 * applies a tiny English suffix fold (plurals/gerunds), and removes
 * stopwords. Deliberately minimal, deterministic, dependency-free.
 */
export function tokenize(input: string): string[] {
  return (input ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .map(stem)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

const STOPWORDS = new Set([
  'the', 'is', 'at', 'on', 'of', 'to', 'in', 'it', 'for', 'you', 'your',
  'what', 'are', 'and', 'do', 'does', 'how', 'much', 'many', 'can', 'i',
  'a', 'an', 'any', 'me', 'my', 'we', 'our', 'with', 'about', 'have',
  'has', 'there', 'that', 'this', 'from', 'will', 'be', 'was', 'were',
  'all', 'its', 'his', 'her', 'them', 'they', 'she', 'him',
]);

/** Very small suffix fold — enough for studio vocabulary, safe on proper nouns. */
function stem(token: string): string {
  let t = token;
  if (t.length > 4 && t.endsWith('ies')) return `${t.slice(0, -3)}y`;
  if (t.length > 4 && t.endsWith('ing')) return t.slice(0, -3);
  if (t.length > 3 && t.endsWith('es')) return t.slice(0, -2);
  if (t.length > 3 && t.endsWith('s')) return t.slice(0, -1);
  return t;
}
