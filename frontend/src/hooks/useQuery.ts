import { useState, useCallback, useRef } from 'react';
import { streamQuery } from '../api/client';
import type { Citation, HallucinationResult, QueryMetrics } from '../types';

export function useQuery() {
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [answer, setAnswer] = useState('');
  const [citations, setCitations] = useState<Citation[]>([]);
  const [sources, setSources] = useState<Array<{ text: string; filename: string; page_num: number }>>([]);
  const [hallucination, setHallucination] = useState<HallucinationResult | null>(null);
  const [metrics, setMetrics] = useState<QueryMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const startTimeRef = useRef<number>(0);

  const submit = useCallback((question: string, docId: string) => {
    // Cancel any in-flight request
    cancelRef.current?.();

    setIsLoading(true);
    setIsStreaming(false);
    setAnswer('');
    setCitations([]);
    setSources([]);
    setHallucination(null);
    setMetrics(null);
    setError(null);
    startTimeRef.current = Date.now();

    let retrievalMs = 0;
    let generationStart = 0;

    const cancel = streamQuery(question, docId, {
      onSources: (srcs) => {
        setSources(srcs);
        retrievalMs = Date.now() - startTimeRef.current;
        setIsLoading(false);
        setIsStreaming(true);
        generationStart = Date.now();
      },
      onToken: (token) => {
        setAnswer((prev) => prev + token);
      },
      onComplete: (data) => {
        const generationMs = Date.now() - generationStart;
        const totalMs = Date.now() - startTimeRef.current;
        setHallucination(data.hallucination as HallucinationResult);
        setMetrics({
          retrieval_ms: retrievalMs,
          rerank_ms: 0,
          generation_ms: generationMs,
          total_ms: totalMs,
        });
        setIsStreaming(false);
        setIsLoading(false);
      },
      onError: (err) => {
        setError(err.message);
        setIsLoading(false);
        setIsStreaming(false);
      },
    });

    cancelRef.current = cancel;
  }, []);

  const reset = useCallback(() => {
    cancelRef.current?.();
    setAnswer('');
    setCitations([]);
    setSources([]);
    setHallucination(null);
    setMetrics(null);
    setError(null);
    setIsLoading(false);
    setIsStreaming(false);
  }, []);

  return {
    submit,
    reset,
    isLoading,
    isStreaming,
    answer,
    citations,
    sources,
    hallucination,
    metrics,
    error,
  };
}
