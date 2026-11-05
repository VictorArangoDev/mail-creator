import { useState } from 'react';
import { useCartStore } from '../../../compared/presentation/useCartStore'; 
import { SqlPreviewModal } from './SqlPreviewModal';
import type { GenerateScript } from '../../../compared/domain/entities/PendingChange';

export function CartPanel() {
  const { changes, removeChange, clear } = useCartStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [script, setScript] = useState<GenerateScript | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Agrupar por tabla para mostrar
  const byTable = new Map<string, typeof changes>();
  for (const change of changes) {
    const key = change.definition.tableName;
    if (!byTable.has(key)) byTable.set(key, []);
    byTable.get(key)!.push(change);
  }

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changes: changes.map(c => ({
            tableName: c.definition.tableName,
            filterValue: c.filterValue,
            item: c.item,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error generando SQL');
      }
      const data: GenerateScript = await res.json();
      setScript(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (changes.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-30 w-80 bg-white rounded-xl border-2 border-blue-500 shadow-2xl">
        <div className="bg-blue-600 text-white px-4 py-3 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined">playlist_add_check</span>
            <span className="font-bold text-sm">Script pendiente</span>
          </div>
          <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold">
            {changes.length}
          </span>
        </div>

        <div className="max-h-64 overflow-y-auto p-3 space-y-2">
          {Array.from(byTable.entries()).map(([tableName, tableChanges]) => (
            <div key={tableName} className="border border-slate-200 rounded-lg p-2">
              <div className="text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>{tableName}</span>
                <span className="text-slate-500 font-normal">{tableChanges.length} cambios</span>
              </div>
              <div className="space-y-1">
                {tableChanges.map(change => (
                  <div key={change.id} className="flex items-center justify-between text-xs bg-slate-50 rounded px-2 py-1">
                    <span className="text-slate-600 font-mono truncate">
                      {change.item.displayKey}
                    </span>
                    <button
                      onClick={() => removeChange(change.id)}
                      className="text-slate-400 hover:text-red-600 shrink-0"
                      title="Quitar"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mx-3 mb-2 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
            {error}
          </div>
        )}

        <div className="p-3 border-t border-slate-100 space-y-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">code</span>
            {isGenerating ? 'Generando...' : 'Generar Script Final'}
          </button>
          <button
            onClick={() => { if (confirm('Eliminar Cambios?')) clear(); }}
            className="w-full text-slate-500 hover:text-red-600 text-xs"
          >
            Eliminar Cambios
          </button>
        </div>
      </div>

      {script && (
        <SqlPreviewModal
          script={script}
          onClose={() => setScript(null)}
        />
      )}
    </>
  );
}