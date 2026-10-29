import { useState } from 'react';
import { ComparisonFilterBar, type TableDefLite } from './ComparisonFilterBar';
import { StatsCards } from './StatsCards';
import { ComparisonTable } from './ComparisonTable';
import type { ComparisonResult, ComparisonItem  } from '../../../compared/domain/entities/ComparisonResult';

interface Props {
  tables: TableDefLite[];
}

export function ComparisonWorkspace({ tables }: Props) {
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [selectedItems, setSelectedItems] = useState<ComparisonItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<{ table: string; filter: string | number } | null>(null);

  const handleCompare = async (params: {
    table: string;
    filter: string | number;
    context: any;
  }) => {
    setIsLoading(true);
    setError(null);
    setSelectedItems([]);
    try {
      const res = await fetch(`/api/compare?table=${encodeURIComponent(params.table)}&filter=${encodeURIComponent(String(params.filter))}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data: ComparisonResult = await res.json();
      setResult(data);
      setCurrentFilter({ table: params.table, filter: params.filter });
    } catch (e: any) {
      setError(e.message);
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <ComparisonFilterBar tables={tables} onCompare={handleCompare} isLoading={isLoading} />

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg px-4 py-3 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <>
          <StatsCards stats={result.stats} selectedCount={selectedItems.length} />

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">{result.displayName}</h2>
              <p className="text-sm text-slate-500">
                {result.filterColumn} = {String(result.filterValue)} · {result.stats.totalComparados} registros
              </p>
            </div>
            <button
              disabled={selectedItems.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              onClick={() => console.log('Semana 4: generar SQL para', selectedItems)}
            >
              Generar SQL ({selectedItems.length})
            </button>
          </div>

          <ComparisonTable
            items={result.items}
            onSelectionChange={setSelectedItems}
          />
        </>
      )}

      {!result && !error && (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl py-16 text-center text-slate-400">
          Selecciona una tabla y un filtro para comenzar la comparación
        </div>
      )}
    </div>
  );
}