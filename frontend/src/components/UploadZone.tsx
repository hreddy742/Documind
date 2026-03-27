import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, CheckCircle, FileText } from 'lucide-react';

type Strategy = 'fixed' | 'semantic' | 'sentence_window';

interface Props {
  onUpload: (file: File, strategy: Strategy) => Promise<{ chunks_created: number; total_ms: number }>;
}

type UploadState = 'idle' | 'dragging' | 'uploading' | 'done' | 'error';

const STRATEGY_OPTIONS: { value: Strategy; label: string; description: string }[] = [
  { value: 'fixed', label: 'Fixed size', description: 'Fast, consistent chunks (recommended for most documents)' },
  { value: 'semantic', label: 'Semantic', description: 'Groups related sentences together' },
  { value: 'sentence_window', label: 'Sentence window', description: 'Best for precise Q&A' },
];

const UPLOAD_STEPS = ['Extracting text...', 'Chunking...', 'Embedding...', 'Done'];

export function UploadZone({ onUpload }: Props) {
  const [state, setState] = useState<UploadState>('idle');
  const [strategy, setStrategy] = useState<Strategy>('fixed');
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<{ filename: string; chunks: number; ms: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFile = useCallback(async (file: File) => {
    setState('uploading');
    setProgress(0);
    setStepIndex(0);

    // Simulate step progression while uploading
    const stepTimer = setInterval(() => {
      setStepIndex((prev) => {
        const next = prev + 1;
        setProgress(Math.min((next / (UPLOAD_STEPS.length - 1)) * 90, 90));
        return next < UPLOAD_STEPS.length - 1 ? next : prev;
      });
    }, 600);

    try {
      const res = await onUpload(file, strategy);
      clearInterval(stepTimer);
      setProgress(100);
      setStepIndex(UPLOAD_STEPS.length - 1);
      setResult({ filename: file.name, chunks: res.chunks_created, ms: res.total_ms });
      setState('done');
    } catch (err: unknown) {
      clearInterval(stepTimer);
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setErrorMsg(msg);
      setState('error');
    }
  }, [onUpload, strategy]);

  const onDrop = useCallback((accepted: File[], rejected: File[]) => {
    if (rejected.length > 0) {
      setErrorMsg('File type not supported. Use PDF, DOCX, or TXT.');
      setState('error');
      return;
    }
    if (accepted.length > 0) handleFile(accepted[0]);
  }, [handleFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxSize: 50 * 1024 * 1024,
    multiple: false,
    onDragEnter: () => setState('dragging'),
    onDragLeave: () => setState((s) => s === 'dragging' ? 'idle' : s),
  });

  const reset = () => {
    setState('idle');
    setProgress(0);
    setStepIndex(0);
    setResult(null);
    setErrorMsg('');
  };

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`
          relative rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all
          ${isDragActive || state === 'dragging'
            ? 'border-primary bg-blue-50'
            : state === 'done'
            ? 'border-success bg-green-50'
            : state === 'error'
            ? 'border-danger bg-red-50'
            : 'border-border bg-surface hover:border-primary hover:bg-blue-50/30'
          }
        `}
      >
        <input {...getInputProps()} />

        {state === 'idle' || state === 'dragging' ? (
          <div className="flex flex-col items-center text-center gap-2">
            <Upload className={`w-8 h-8 ${isDragActive ? 'text-primary' : 'text-muted'}`} />
            <p className="text-sm font-medium text-text-main">
              {isDragActive ? 'Drop it here' : 'Drag PDF, DOCX, or TXT here'}
            </p>
            <p className="text-xs text-muted">or click to browse · max 50 MB</p>
          </div>
        ) : state === 'uploading' ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-text-main text-center">
              {UPLOAD_STEPS[stepIndex]}
            </p>
            <div className="h-2 w-full rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : state === 'done' && result ? (
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-success flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-main truncate">{result.filename}</p>
              <p className="text-xs text-muted">{result.chunks} chunks · {(result.ms / 1000).toFixed(1)}s</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); reset(); }}
              className="ml-auto text-xs text-muted hover:text-text-main underline"
            >
              Upload another
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <p className="text-sm text-danger">{errorMsg}</p>
            <button
              onClick={(e) => { e.stopPropagation(); reset(); }}
              className="ml-auto text-xs text-muted hover:text-text-main underline"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Strategy selector */}
      <div className="space-y-1.5">
        {STRATEGY_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className="flex items-start gap-2.5 cursor-pointer group"
          >
            <input
              type="radio"
              name="strategy"
              value={opt.value}
              checked={strategy === opt.value}
              onChange={() => setStrategy(opt.value)}
              className="mt-0.5 accent-primary"
            />
            <span className="text-xs leading-relaxed">
              <span className="font-medium text-text-main">{opt.label}</span>
              <span className="text-muted"> — {opt.description}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
