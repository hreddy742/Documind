import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { Send, FileText } from 'lucide-react';
import type { DocumentInfo } from '../types';

interface Props {
  activeDocument: DocumentInfo | null;
  onSubmit: (question: string) => void;
  isLoading: boolean;
}

const EXAMPLE_QUESTIONS = [
  'Summarize this document',
  'What are the key findings?',
  'List the main recommendations',
];

const MAX_LEN = 2000;

export function QueryInterface({ activeDocument, onSubmit, isLoading }: Props) {
  const [question, setQuestion] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSubmit = !!activeDocument && question.trim().length >= 3 && !isLoading;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    onSubmit(question.trim());
  }, [canSubmit, onSubmit, question]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [question]);

  return (
    <div className="space-y-3">
      {/* Active document indicator */}
      {activeDocument ? (
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <FileText className="w-3.5 h-3.5" />
          <span>Asking about: <span className="font-medium text-text-main">{activeDocument.filename}</span></span>
        </div>
      ) : (
        <p className="text-xs text-muted">Select a document to start asking questions</p>
      )}

      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value.slice(0, MAX_LEN))}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about your document..."
          rows={3}
          disabled={!activeDocument || isLoading}
          className="w-full resize-none rounded-xl border border-border bg-white px-4 py-3 pr-12 text-sm text-text-main placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          style={{ minHeight: '88px', maxHeight: '240px' }}
        />
        <span className="absolute bottom-3 right-3 text-[10px] text-muted select-none">
          {question.length}/{MAX_LEN}
        </span>
      </div>

      {/* Submit row */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 active:scale-95 transition-all"
        >
          <Send className="w-4 h-4" />
          {isLoading ? 'Thinking…' : 'Ask Question'}
        </button>
        <span className="text-xs text-muted">⌘↵ to submit</span>
      </div>

      {/* Example chips (shown when no question typed) */}
      {question.length === 0 && activeDocument && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => setQuestion(q)}
              className="text-xs px-3 py-1.5 rounded-full border border-border bg-surface text-muted hover:border-primary hover:text-primary hover:bg-blue-50 transition-all"
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
