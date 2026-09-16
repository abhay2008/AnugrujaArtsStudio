/**
 * Minimal SSE parser for the chat endpoint's event stream.
 * Accumulates raw text chunks and invokes onEvent for complete events.
 */
export interface SseEvent {
  event: string;
  data: string;
}

export function createSseParser(onEvent: (ev: SseEvent) => void) {
  let buffer = '';

  return {
    push(chunk: string) {
      buffer += chunk;
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';
      for (const part of parts) {
        let event = 'message';
        let data = '';
        for (const line of part.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('data:')) data += line.slice(5).trim();
        }
        if (data) onEvent({ event, data });
      }
    },
  };
}
