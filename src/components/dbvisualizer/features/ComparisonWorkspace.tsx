import { useState } from 'react';
import { ComparisonFilterBar, type TableDefLite } from './ComparisonFilterBar';
import { StatsCards } from './StatsCards';
import { ComparisonTable } from './ComparisonTable';
import { useCartStore } from '../../../compared/presentation/useCartStore';
import { TABLE_DEFINITIONS } from '../../../compared/domain/config/tableDefinitions'; 
import type { ComparisonResult,ComparisonItem } from '../../../compared/domain/entities/ComparisonResult';

interface Props {
  tables: TableDefLite[];
}

interface CompareContext {
  customerNit: string | null;
  productId: number | null;
}

export function ComparisonWorkspace({ tables }: Props) {
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [context, setContext] = useState<CompareContext>({ customerNit: null, productId: null });
  const [selectedItems, setSelectedItems] = useState<ComparisonItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const addChanges = useCartStore(s => s.addChanges);

  const handleCompare = async (params: any) => {
    setIsLoading(true);
    setError(null);
    setSelectedItems([]);
    setResult(null);
    setAdded(false);

    try {
      const newContext: CompareContext = {
        customerNit: params.context.customer?.nit ?? null,
        productId: params.context.product?.productId ?? null,
      };

      const res = await fetch(
        `/api/compare?table=${encodeURIComponent(params.table)}&filter=${encodeURIComponent(String(params.filter))}`
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data: ComparisonResult = await res.json();

      setResult(data);
      setContext(newContext);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!result || selectedItems.length === 0) return;
    const def = TABLE_DEFINITIONS[result.tableName];
    if (!def) return;

    addChanges(def, result.filterValue, selectedItems, {
      customerNit: context.customerNit,
      productId: context.productId,
    });

    setAdded(true);
    setSelectedItems([]);
    setTimeout(() => setAdded(false), 2000);
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

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-slate-800">{result.displayName}</h2>
              <p className="text-sm text-slate-500">
                {result.filterColumn} = {String(result.filterValue)}
              </p>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={selectedItems.length === 0 || added}
              className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                added ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {added ? 'check' : 'playlist_add'}
              </span>
              {added ? '¡Agregado al script!' : `Agregar al script (${selectedItems.length})`}
            </button>
          </div>

          <ComparisonTable result={result} onSelectionChange={setSelectedItems} />
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