import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Citation, HallucinationResult, QueryMetrics } from '../types';
import { CitationCard } from './CitationCard';
import { HallucinationBadge } from './HallucinationBadge';
import { MetricsBar } from './MetricsBar';

interface Props {
  isLoading: boolean;
  isStreaming: boolean;
  answer: string;
  citations: Citation[];
  sources: Array<{ text: string; filename: string; page_num: number }>;
  hallucination: HallucinationResult | null;
  metrics: QueryMetrics | null;
  error: string | null;
}

function ShimmerLine({ width = 'w-full' }: { width?: string }) {
  return (
    <div className={`h-3 rounded ${width} bg-border animate-pulse`} />
  );
}

// Replace [1] [2] [3] with superscript anchor links
function renderAnswerWithCitations(text: string) {
  return text.replace(/\[(\d+)\]/g, (_, n) =>
    `<sup><a href="#citation-${n}" class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold hover:bg-primary hover:text-white transition-colors no-underline">${n}</a></sup>`
  );
}

export function AnswerPanel({
  isLoading,
  isStreaming,
  answer,
  citations,
  sources,
  hallucination,
  metrics,
  error,
}: Props) {
  const cursorRef = useRef<HTMLSpanElement>(null);

  // Build citation cards from sources when we have citations from the answer
  const citationCards: Citation[] = sources.map((s, i) => ({
    number: i + 1,
    text: s.text,
    filename: s.filename,
    page_num: s.page_num,
  }));

  // If final citations available (non-streaming), use those
  const displayCitations = citations.length > 0 ? citations : citationCards;

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-danger">{error}</p>
      </div>
    );
  }

  if (!isLoading && !isStreaming && !answer) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center">
          <span className="text-3xl">📄</span>
        </div>
        <div>
          <p className="text-sm font-medium text-text-main">Ready to answer your questions</p>
          <p className="text-xs text-muted mt-1">Upload a document and ask a question to get started</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-1">
        <div className="space-y-2.5">
          <ShimmerLine />
          <ShimmerLine width="w-5/6" />
          <ShimmerLine width="w-4/6" />
        </div>
        <p className="text-xs text-muted">Retrieving relevant passages…</p>
      </div>
    );
  }

  const processedAnswer = renderAnswerWithCitations(answer);

  return (
    <div className="flex-1 space-y-5 overflow-y-auto">
      {/* Answer */}
      <div className="prose prose-sm max-w-none text-text-main">
        {isStreaming ? (
          <div className="text-sm leading-relaxed">
            <span dangerouslySetInnerHTML={{ __html: processedAnswer }} />
            <span
              ref={cursorRef}
              className="inline-block w-0.5 h-4 bg-text-main ml-0.5 align-middle animate-pulse"
            />
          </div>
        ) : (
          <div
            className="text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: processedAnswer }}
          />
        )}
        {isStreaming && (
          <p className="text-xs text-muted mt-2">Generating…</p>
        )}
      </div>

      {/* Citations */}
      {displayCitations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-text-main uppercase tracking-wide">
            Sources used
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {displayCitations.map((c, i) => (
              <CitationCard
                key={c.number}
                citation={c}
                relevanceScore={Math.max(0.3, 1 - i * 0.15)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Footer: hallucination + metrics */}
      {(hallucination || metrics) && (
        <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-border">
          <div>
            {hallucination && <HallucinationBadge result={hallucination} />}
          </div>
          <div>
            {metrics && <MetricsBar metrics={metrics} />}
          </div>
        </div>
      )}
    </div>
  );
}
