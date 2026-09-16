/**
 * Tiny CLI to talk to the studio chatbot like a visitor would.
 *
 * Usage:
 *   npx tsx scripts/ask-chat.ts "What paintings are for sale?"
 *   npx tsx scripts/ask-chat.ts --base http://127.0.0.1:3002 "How much is painting #3?"
 *   npx tsx scripts/ask-chat.ts --multi "Hi" "What's for sale?" "Any events?"
 *
 * Prints the assistant's final reply (SSE stream reassembled).
 */
const baseIdx = process.argv.indexOf('--base');
const base = baseIdx > -1 ? process.argv[baseIdx + 1] : 'http://127.0.0.1:3002';

function isMessage(arg: string): boolean {
  return arg !== '--base' && arg !== '--multi' && process.argv[argIdx(arg)] !== base;
}

function argIdx(arg: string): number {
  return process.argv.indexOf(arg);
}

const args = process.argv.slice(2).filter((a) => a !== '--base' && a !== '--multi' && a !== base);
const messages = args.length > 0 ? args : ['What paintings are for sale?'];

async function send(convo: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: convo }),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    return `[HTTP ${res.status}] ${text}`;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let reply = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      let event = 'message';
      let data = '';
      for (const line of part.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (!data) continue;
      try {
        const json = JSON.parse(data) as { text?: string };
        if (event === 'delta' && json.text) reply += json.text;
        if (event === 'replace' && json.text) reply = json.text;
      } catch {
        /* partial */
      }
    }
  }
  return reply || '(empty reply)';
}

async function main() {
  const convo: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const msg of messages) {
    convo.push({ role: 'user', content: msg });
    process.stdout.write(`\n🧑 USER: ${msg}\n🤖 CHITRA: `);
    const reply = await send([...convo]);
    process.stdout.write(reply + '\n');
    convo.push({ role: 'assistant', content: reply });
  }
}

void main();
