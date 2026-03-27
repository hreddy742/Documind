import type { QueryMetrics } from '../types';

interface Props {
  metrics: QueryMetrics;
  tokensUsed?: number;
}

function fmt(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

export function MetricsBar({ metrics, tokensUsed }: Props) {
  const items = [
    { label: 'Retrieval', value: fmt(metrics.retrieval_ms) },
    { label: 'Rerank', value: fmt(metrics.rerank_ms) },
    { label: 'Generation', value: fmt(metrics.generation_ms) },
    { label: 'Total', value: fmt(metrics.total_ms) },
  ];

  return (
    <div className="flex items-center gap-1 flex-wrap text-[11px] text-muted">
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-1">
          {i > 0 && <span className="opacity-40">·</span>}
          <span className="font-medium text-text-main">{item.label}</span>
          <span>{item.value}</span>
        </span>
      ))}
      {tokensUsed !== undefined && (
        <>
          <span className="opacity-40">·</span>
          <span>~{tokensUsed} tokens</span>
        </>
      )}
    </div>
  );
}
