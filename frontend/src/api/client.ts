import axios from 'axios';
import type { DocumentInfo, QueryResponse } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

const api = axios.create({ baseURL: BASE_URL });

export async function uploadDocument(
  file: File,
  strategy: string,
  onProgress?: (pct: number) => void
): Promise<{ doc_id: string; filename: string; chunks_created: number; strategy: string; total_ms: number }> {
  const form = new FormData();
  form.append('file', file);
  form.append('strategy', strategy);

  const res = await api.post('/documents/upload', form, {
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
  return res.data;
}

export async function listDocuments(): Promise<DocumentInfo[]> {
  const res = await api.get('/documents/');
  return res.data;
}

export async function deleteDocument(docId: string): Promise<void> {
  await api.delete(`/documents/${docId}`);
}

export async function queryDocument(question: string, docId: string): Promise<QueryResponse> {
  const res = await api.post('/query/', { question, doc_id: docId, stream: false });
  return res.data;
}

export function streamQuery(
  question: string,
  docId: string,
  callbacks: {
    onSources?: (sources: Array<{ text: string; filename: string; page_num: number }>) => void;
    onToken?: (token: string) => void;
    onComplete?: (data: { hallucination: { risk: string; score: number; explanation: string } }) => void;
    onError?: (err: Error) => void;
  }
): () => void {
  let cancelled = false;

  (async () => {
    try {
      const response = await fetch(`${BASE_URL}/query/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, doc_id: docId, stream: true }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (eventType === 'sources') callbacks.onSources?.(data);
              else if (eventType === 'token') callbacks.onToken?.(data.token);
              else if (eventType === 'complete') callbacks.onComplete?.(data);
            } catch {
              // skip malformed JSON
            }
            eventType = '';
          }
        }
      }
    } catch (err) {
      if (!cancelled) callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  return () => { cancelled = true; };
}
