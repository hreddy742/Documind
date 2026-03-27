export interface Citation {
  number: number;
  text: string;
  filename: string;
  page_num: number;
}

export interface HallucinationResult {
  risk: 'low' | 'medium' | 'high' | 'unknown';
  score: number;
  explanation: string;
}

export interface QueryMetrics {
  retrieval_ms: number;
  rerank_ms: number;
  generation_ms: number;
  total_ms: number;
}

export interface QueryResponse {
  answer: string;
  citations: Citation[];
  hallucination: HallucinationResult;
  metrics: QueryMetrics;
}

export interface DocumentInfo {
  doc_id: string;
  filename: string;
  chunks: number;
  strategy: string;
  created_at: string;
  size_bytes: number;
}
