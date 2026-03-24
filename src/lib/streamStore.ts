// In-memory SSE stream store (per Node.js process)
// Each submission has a buffer of chunks and a done flag.

interface StreamEntry {
  chunks: string[];
  done: boolean;
  error?: string;
  createdAt: number;
}

const globalForStream = global as unknown as { 
  streamStore: Map<string, StreamEntry>;
  streamInterval: NodeJS.Timeout | null;
}

const store = globalForStream.streamStore || new Map<string, StreamEntry>();

if (!globalForStream.streamStore) {
  globalForStream.streamStore = store;
}

// Clean up entries older than 30 minutes
if (!globalForStream.streamInterval) {
  globalForStream.streamInterval = setInterval(() => {
    const cutoff = Date.now() - 30 * 60 * 1000;
    for (const [key, entry] of store) {
      if (entry.createdAt < cutoff) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

export function createStream(id: string) {
  store.set(id, { chunks: [], done: false, createdAt: Date.now() });
}

export function appendChunk(id: string, text: string) {
  const entry = store.get(id);
  if (entry) entry.chunks.push(text);
}

export function finalizeStream(id: string, error?: string) {
  const entry = store.get(id);
  if (entry) {
    entry.done = true;
    if (error) entry.error = error;
  }
}

export function getStream(id: string): StreamEntry | undefined {
  return store.get(id);
}
