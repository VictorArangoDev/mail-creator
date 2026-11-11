import { useState } from 'react';
import { useCartStore } from '../../../compared/presentation/useCartStore'; 
import { SqlPreviewModal } from './SqlPreviewModal';
import type { GenerateScript } from '../../../compared/domain/entities/PendingChange';

import { useDirectionPreview } from '../../../compared/presentation/hooks/useDirectionPreview'; 
import { DirectionToggle } from './DirectionToggle';



export function CartPanel() {
  const { changes, direction, removeChange, removeByTable, clear } = useCartStore();
  const stats = useDirectionPreview(changes, direction);

  const [isGenerating, setIsGenerating] = useState(false);
  const [script, setScript] = useState<GenerateScript | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

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
          direction,
          changes: changes.map(c => ({
            tableName: c.definition.tableName,
            filterValue: c.filterValue,
            item: c.item,
            context: c.context,
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
      <div
        className={`fixed bottom-6 right-6 z-30 bg-white rounded-xl border-2 shadow-2xl transition-all ${
          direction === 'TEST_TO_PROD' ? 'border-blue-500' : 'border-amber-500'
        } ${collapsed ? 'w-16' : 'w-96'}`}
      >
        {/* Header */}
        <div
          className={`text-white px-4 py-3 rounded-t-xl flex items-center justify-between ${
            direction === 'TEST_TO_PROD' ? 'bg-blue-600' : 'bg-amber-600'
          }`}
        >
          {!collapsed && (
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined">playlist_add_check</span>
              <span className="font-bold text-sm">Script pendiente</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            {!collapsed && (
              <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold">
                {changes.length}
              </span>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-white/80 hover:text-white"
              title={collapsed ? 'Expandir' : 'Colapsar'}
            >
              <span className="material-symbols-outlined text-[20px]">
                {collapsed ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          </div>
        </div>

        {!collapsed && (
          <>
            {/* Dirección */}
            <div className="px-3 pt-3">
              <DirectionToggle compact />
            </div>

            {/* Preview stats */}
            <div className="px-3 pt-2 pb-2 flex flex-wrap gap-1.5">
              <StatBadge label="UPDATE" value={stats.updates} color="blue" />
              <StatBadge label="INSERT" value={stats.inserts} color="emerald" />
              {stats.warnings > 0 && (
                <StatBadge label="WARNING" value={stats.warnings} color="amber" />
              )}
              <StatBadge label="Tablas" value={stats.tables} color="slate" />
            </div>

            {/* Lista por tabla */}
            <div className="max-h-80 overflow-y-auto px-3 pb-2 space-y-2">
              {Array.from(byTable.entries()).map(([tableName, tableChanges]) => (
                <div key={tableName} className="border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between bg-slate-50 px-2.5 py-1.5 border-b border-slate-100 rounded-t-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[11px] font-bold text-slate-700 truncate">
                        {tableName}
                      </span>
                      <span className="text-[10px] text-slate-500 bg-white border border-slate-200 rounded px-1.5 py-0.5 shrink-0">
                        {tableChanges.length}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`¿Quitar los ${tableChanges.length} cambios de ${tableName}?`)) {
                          removeByTable(tableName);
                        }
                      }}
                      className="text-slate-400 hover:text-red-600 transition-colors shrink-0"
                      title="Vaciar esta tabla"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                    </button>
                  </div>
                  <div className="p-1.5 space-y-1">
                    {tableChanges.map(change => {
                      const statusColor = {
                        DIFERENTE: 'bg-blue-100 text-blue-700',
                        NUEVO_EN_TEST: 'bg-emerald-100 text-emerald-700',
                        NUEVO_EN_PROD: 'bg-rose-100 text-rose-700',
                        IGUAL: 'bg-slate-100 text-slate-600',
                      }[change.item.status];

                      return (
                        <div
                          key={change.id}
                          className="flex items-center justify-between text-[11px] bg-slate-50 hover:bg-slate-100 rounded px-2 py-1 transition-colors"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${statusColor}`}>
                              {change.item.status === 'DIFERENTE' ? 'UPD' :
                               change.item.status === 'NUEVO_EN_TEST' ? 'INS' :
                               change.item.status === 'NUEVO_EN_PROD' ? 'WARN' : '—'}
                            </span>
                            <span className="text-slate-600 font-mono truncate">
                              {change.item.displayKey}
                            </span>
                          </div>
                          <button
                            onClick={() => removeChange(change.id)}
                            className="text-slate-400 hover:text-red-600 shrink-0 ml-1"
                            title="Quitar cambio"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="mx-3 mb-2 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                {error}
              </div>
            )}

            {/* Footer acciones */}
            <div className="p-3 border-t border-slate-100 space-y-2">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className={`w-full text-white py-2 rounded-lg font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-colors ${
                  direction === 'TEST_TO_PROD'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">code</span>
                {isGenerating ? 'Generando...' : `Generar ${direction === 'TEST_TO_PROD' ? 'TEST → PROD' : 'PROD → TEST'}`}
              </button>
              <button
                onClick={() => {
                  if (confirm('¿Vaciar TODO el carrito?')) clear();
                }}
                className="w-full text-slate-500 hover:text-red-600 text-xs"
              >
                Vaciar carrito completo ({changes.length})
              </button>
            </div>
          </>
        )}
      </div>

      {script && (
        <SqlPreviewModal
          script={script}
          direction={direction}
          onClose={() => setScript(null)}
        />
      )}
    </>
  );
}

function StatBadge({
  label, value, color,
}: {
  label: string;
  value: number;
  color: 'blue' | 'emerald' | 'amber' | 'slate';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
  }[color];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold ${colorClasses}`}>
      <span>{value}</span>
      <span className="opacity-70 font-normal">{label}</span>
    </span>
  );
}