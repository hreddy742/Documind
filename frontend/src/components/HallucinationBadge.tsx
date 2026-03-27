import { useState } from 'react';
import type { HallucinationResult } from '../types';

interface Props {
  result: HallucinationResult;
}

const CONFIG = {
  low: {
    bg: 'bg-green-100 text-green-800',
    icon: '✓',
    label: 'Grounded in sources',
  },
  medium: {
    bg: 'bg-amber-100 text-amber-800',
    icon: '⚠',
    label: 'Partially supported',
  },
  high: {
    bg: 'bg-red-100 text-red-800',
    icon: '✗',
    label: 'Verify independently',
  },
  unknown: {
    bg: 'bg-gray-100 text-gray-600',
    icon: '○',
    label: 'Risk unscored',
  },
} as const;

export function HallucinationBadge({ result }: Props) {
  const [showTip, setShowTip] = useState(false);
  const cfg = CONFIG[result.risk] ?? CONFIG.unknown;

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg}`}
      >
        <span>{cfg.icon}</span>
        {cfg.label}
      </button>

      {showTip && (
        <div className="absolute bottom-full left-0 mb-2 z-10 w-64 rounded-lg border border-border bg-white shadow-lg p-3 text-xs text-text-main">
          <p className="font-medium mb-1">Hallucination Risk: {result.risk}</p>
          <p className="text-muted">{result.explanation}</p>
          <p className="text-muted mt-1">Entailment score: {Math.round(result.score * 100)}%</p>
        </div>
      )}
    </div>
  );
}
