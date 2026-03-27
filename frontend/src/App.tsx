import { useState, useCallback } from 'react';
import { UploadZone } from './components/UploadZone';
import { DocumentList } from './components/DocumentList';
import { QueryInterface } from './components/QueryInterface';
import { AnswerPanel } from './components/AnswerPanel';
import { useDocuments } from './hooks/useDocuments';
import { useQuery } from './hooks/useQuery';
import { uploadDocument } from './api/client';
import type { DocumentInfo } from './types';

export default function App() {
  const { documents, loading, refresh, remove } = useDocuments();
  const [activeDoc, setActiveDoc] = useState<DocumentInfo | null>(null);
  const query = useQuery();

  const handleUpload = useCallback(async (file: File, strategy: string) => {
    const result = await uploadDocument(file, strategy);
    await refresh();
    // Auto-select newly uploaded document
    setActiveDoc({
      doc_id: result.doc_id,
      filename: result.filename,
      chunks: result.chunks_created,
      strategy: result.strategy,
      created_at: new Date().toISOString(),
      size_bytes: 0,
    });
    return result;
  }, [refresh]);

  const handleSelect = useCallback((doc: DocumentInfo) => {
    setActiveDoc(doc);
    query.reset();
  }, [query]);

  const handleDelete = useCallback(async (docId: string) => {
    await remove(docId);
    if (activeDoc?.doc_id === docId) {
      setActiveDoc(null);
      query.reset();
    }
  }, [remove, activeDoc, query]);

  const handleSubmit = useCallback((question: string) => {
    if (!activeDoc) return;
    query.submit(question, activeDoc.doc_id);
  }, [activeDoc, query]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border px-6 py-3 flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧠</span>
          <span className="font-bold text-text-main text-lg">DocuMind</span>
        </div>
        <span className="text-xs text-muted hidden sm:block">
          Enterprise document intelligence · 100% open source
        </span>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Left panel */}
        <aside className="w-full md:w-80 lg:w-96 flex-shrink-0 border-b md:border-b-0 md:border-r border-border flex flex-col overflow-y-auto">
          <div className="p-4 space-y-5">
            {/* Upload */}
            <section>
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
                Upload Document
              </h2>
              <UploadZone onUpload={handleUpload} />
            </section>

            {/* Documents */}
            <section>
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                Your Documents
              </h2>
              <div className="rounded-xl border border-border overflow-hidden">
                <DocumentList
                  documents={documents}
                  loading={loading}
                  activeDocId={activeDoc?.doc_id ?? null}
                  onSelect={handleSelect}
                  onDelete={handleDelete}
                />
              </div>
            </section>
          </div>
        </aside>

        {/* Right panel */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex flex-col h-full p-5 gap-5">
            {/* Query input */}
            <section className="flex-shrink-0">
              <QueryInterface
                activeDocument={activeDoc}
                onSubmit={handleSubmit}
                isLoading={query.isLoading}
              />
            </section>

            {/* Answer area */}
            <section className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-border bg-surface p-5 flex flex-col">
              <AnswerPanel
                isLoading={query.isLoading}
                isStreaming={query.isStreaming}
                answer={query.answer}
                citations={query.citations}
                sources={query.sources}
                hallucination={query.hallucination}
                metrics={query.metrics}
                error={query.error}
              />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
