import { useState } from 'react';
import type { Citation } from '../types';

interface Props {
  citation: Citation;
  relevanceScore?: number;
}

export function CitationCard({ citation, relevanceScore = 0.75 }: Props) {
  const [expanded, setExpanded] = useState(false);
  const short = citation.text.slice(0, 200);
  const hasMore = citation.text.length > 200;

  return (
    <div
      id={`citation-${citation.number}`}
      className="rounded-xl border border-border bg-white p-4 hover:shadow-md transition-shadow cursor-default space-y-3"
    >
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
          {citation.number}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-border text-muted font-medium">
          {citation.filename}
        </span>
        <span className="text-xs text-muted">Page {citation.page_num}</span>
      </div>

      {/* Excerpt */}
      <p className="text-xs text-text-main leading-relaxed">
        {expanded ? citation.text : short}
        {hasMore && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="ml-1 text-primary hover:underline"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </p>

      {/* Relevance bar */}
      <div>
        <div className="flex justify-between text-[10px] text-muted mb-1">
          <span>Relevance</span>
          <span>{Math.round(relevanceScore * 100)}%</span>
        </div>
        <div className="h-1 w-full rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-primary/70 transition-all"
            style={{ width: `${relevanceScore * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
