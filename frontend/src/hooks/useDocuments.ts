import { useState, useEffect, useCallback } from 'react';
import { listDocuments, deleteDocument } from '../api/client';
import type { DocumentInfo } from '../types';

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const docs = await listDocuments();
      setDocuments(docs);
    } catch (err) {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const remove = useCallback(async (docId: string) => {
    await deleteDocument(docId);
    setDocuments((prev) => prev.filter((d) => d.doc_id !== docId));
  }, []);

  return { documents, loading, error, refresh, remove };
}
