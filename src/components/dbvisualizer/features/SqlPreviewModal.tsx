import { useState } from 'react';
import type { GenerateScript } from '../../../compared/domain/entities/PendingChange'; 
import type { SyncDirection } from '../../../compared/presentation/useCartStore'; 


interface Props {
  script: GenerateScript;
  direction: SyncDirection;
  onClose: () => void;
}

export function SqlPreviewModal({ script, direction, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(script.sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([script.sql], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().substring(0, 10);
    const dirLabel = direction === 'TEST_TO_PROD' ? 'test-to-prod' : 'prod-to-test';
    a.href = url;
    a.download = `db-promote-${dirLabel}-${date}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              Script SQL generado
              <span
                className={`text-xs px-2 py-0.5 rounded font-semibold ${
                  direction === 'TEST_TO_PROD'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {direction === 'TEST_TO_PROD' ? 'TEST → PROD' : 'PROD → TEST'}
              </span>
            </h2>
            <p className="text-sm text-slate-500">
              {script.stats.tables} tabla(s) · {script.stats.updates} UPDATE · {script.stats.inserts} INSERT · {script.stats.warnings} warning(s)
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-slate-900 p-4">
          <pre className="text-xs font-mono text-emerald-300 whitespace-pre-wrap break-words leading-relaxed">
            {script.sql}
          </pre>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex gap-2 justify-end">
          <button
            onClick={handleDownload}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-sm flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Descargar .sql
          </button>
          <button
            onClick={handleCopy}
            className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${
              copied ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {copied ? 'check' : 'content_copy'}
            </span>
            {copied ? '¡Copiado!' : 'Copiar al portapapeles'}
          </button>
        </div>
      </div>
    </div>
  );
}