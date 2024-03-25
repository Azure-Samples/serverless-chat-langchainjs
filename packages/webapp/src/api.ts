import { type ChatResponse, type ChatRequestOptions, type ChatResponseChunk } from './models.js';

export const apiBaseUrl: string = import.meta.env.VITE_API_URL || 'api';

export async function getCompletion(options: ChatRequestOptions) {
  const apiUrl = options.apiUrl || apiBaseUrl;
  const response = await fetch(`${apiUrl}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: options.messages,
      stream: options.stream,
      context: {
        top: options.top,
        temperature: options.temperature,
      },
    }),
  });

  if (options.stream) {
    return getChunksFromResponse<ChatResponseChunk>(response, options.chunkIntervalMs);
  }

  const json: ChatResponse = await response.json();
  if (response.status > 299 || !response.ok) {
    throw new Error(json.error ?? 'Unknown error');
  }

  return json;
}

export function getCitationUrl(citation: string): string {
  return `${apiBaseUrl}/documents/${citation}`;
}

export class NdJsonParserStream extends TransformStream<string, JSON> {
  private buffer = '';
  constructor() {
    let controller: TransformStreamDefaultController<JSON>;
    super({
      start(_controller) {
        controller = _controller;
      },
      transform: (chunk) => {
        const jsonChunks = chunk.split('\n').filter(Boolean);
        for (const jsonChunk of jsonChunks) {
          try {
            this.buffer += jsonChunk;
            controller.enqueue(JSON.parse(this.buffer));
            this.buffer = '';
          } catch {
            // Invalid JSON, wait for next chunk
          }
        }
      },
    });
  }
}

export async function* getChunksFromResponse<T>(response: Response, intervalMs: number): AsyncGenerator<T, void> {
  const reader = response.body?.pipeThrough(new TextDecoderStream()).pipeThrough(new NdJsonParserStream()).getReader();
  if (!reader) {
    throw new Error('No response body or body is not readable');
  }

  let value: JSON | undefined;
  let done: boolean;
  // eslint-disable-next-line no-await-in-loop
  while ((({ value, done } = await reader.read()), !done)) {
    const chunk = value as T;
    yield new Promise<T>((resolve) => {
      setTimeout(() => {
        resolve(chunk);
      }, intervalMs);
    });
  }
}
