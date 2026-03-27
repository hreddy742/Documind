import { FileText, FileType, File, Trash2 } from 'lucide-react';
import type { DocumentInfo } from '../types';

interface Props {
  documents: DocumentInfo[];
  loading: boolean;
  activeDocId: string | null;
  onSelect: (doc: DocumentInfo) => void;
  onDelete: (docId: string) => void;
}

const STRATEGY_LABELS: Record<string, string> = {
  fixed: 'Fixed',
  semantic: 'Semantic',
  sentence_window: 'Sentence Window',
};

function FileIcon({ filename }: { filename: string }) {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <FileType className="w-4 h-4 text-red-500 flex-shrink-0" />;
  if (ext === 'docx') return <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />;
  return <File className="w-4 h-4 text-muted flex-shrink-0" />;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-3 py-3 animate-pulse">
      <div className="w-4 h-4 rounded bg-border" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-border rounded w-3/4" />
        <div className="h-2.5 bg-border rounded w-1/2" />
      </div>
    </div>
  );
}

export function DocumentList({ documents, loading, activeDocId, onSelect, onDelete }: Props) {
  if (loading) {
    return (
      <div className="divide-y divide-border">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="px-3 py-8 text-center text-xs text-muted">
        No documents uploaded yet
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {documents.map((doc) => {
        const isActive = doc.doc_id === activeDocId;
        return (
          <div
            key={doc.doc_id}
            onClick={() => onSelect(doc)}
            className={`
              relative flex items-start gap-3 px-3 py-3 cursor-pointer
              hover:bg-surface transition-colors group
              ${isActive ? 'bg-blue-50' : ''}
            `}
          >
            {/* Active indicator */}
            {isActive && (
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-r" />
            )}

            <FileIcon filename={doc.filename} />

            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-text-main truncate" title={doc.filename}>
                {truncate(doc.filename, 30)}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-border text-muted font-medium">
                  {STRATEGY_LABELS[doc.strategy] ?? doc.strategy}
                </span>
                <span className="text-[10px] text-muted">{doc.chunks} chunks</span>
                <span className="text-[10px] text-muted">{formatDate(doc.created_at)}</span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete "${doc.filename}"?`)) onDelete(doc.doc_id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 text-muted hover:text-danger transition-all flex-shrink-0"
              title="Delete document"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
