import { useState } from 'react';
import { useContextStore } from '../../../compared/presentation/useContextStore'; 
import type { ContextLevel } from '../../../compared/domain/config/tableDefinitions';

export type TableDefLite = {
  tableName: string;
  displayName: string;
  selectorType: 'CONTEXT' | 'MANUAL';
  contextLevel?: string;  
  manualPlaceholder?: string;
};

interface Props {
  tables: TableDefLite[];
  onCompare: (params: { table: string; filter: string | number }) => void;
  isLoading?: boolean;
  onRequestContext: () => void;
}

function resolveContextLevel(table: TableDefLite | null): ContextLevel | null {
  if (!table) return null;
  if (table.contextLevel && table.contextLevel !== '') {
    return table.contextLevel as ContextLevel;
  }

  const name = table.tableName.toLowerCase();
  if (name === 'customers') return 'CUSTOMER';
  if (name === 'settingsbysubproduct') return 'SUBPRODUCT';
  if ([
    'product', 'subproduct', 'settingsbyproduct', 'resources',
    'rulesbyproduct', 'fileschemas', 'filesbyproduct',
    'jsondianequivalences', 'jsondiantemplates', 'fieldbyproduct',
  ].includes(name)) {
    return 'PRODUCT';
  }
  return null;
}

export function ComparisonFilterBar({ tables, onCompare, isLoading, onRequestContext }: Props) {
  const { context } = useContextStore();
  const [selectedTable, setSelectedTable] = useState<TableDefLite | null>(null);
  const [manualValue, setManualValue] = useState('');

  const resolveFilter = (table: TableDefLite): { value: string | number | null; missing?: string } => {
    if (table.selectorType === 'MANUAL') {
      if (!manualValue.trim()) return { value: null, missing: 'ID' };
      return { value: /^\d+$/.test(manualValue) ? Number(manualValue) : manualValue };
    }

    const level = resolveContextLevel(table);
    if (level === 'CUSTOMER') {
      if (!context.customer) return { value: null, missing: 'Customer' };
      return { value: context.customer.nit };
    }
    if (level === 'PRODUCT') {
      if (!context.product) return { value: null, missing: 'Product' };
      return { value: context.product.productId };
    }
    if (level === 'SUBPRODUCT') {
      if (!context.subProduct) return { value: null, missing: 'SubProduct' };
      return { value: context.subProduct.subProductId };
    }
    
    return { value: null, missing: 'contexto' };
  };

  const { value: filterValue, missing } = selectedTable ? resolveFilter(selectedTable) : { value: null };
  const canCompare = !!selectedTable && filterValue !== null;

  const handleCompare = () => {
    if (!selectedTable || filterValue === null) return;
    onCompare({ table: selectedTable.tableName, filter: filterValue });
  };

  return (
    <div className="flex flex-wrap gap-3 items-end p-4 bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="flex flex-col">
        <label className="text-xs font-semibold mb-1 text-slate-700">Tabla</label>
        <select
          className="border border-slate-300 rounded px-3 py-2 min-w-60 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          value={selectedTable?.tableName || ''}
          onChange={(e) => {
            const t = tables.find(x => x.tableName === e.target.value) || null;
            //console.log('🔍 Tabla seleccionada:', t, '| contextLevel resuelto:', resolveContextLevel(t));
            setSelectedTable(t);
            setManualValue('');
          }}
        >
          <option value="">-- Selecciona una tabla --</option>
          {tables.map(t => (
            <option key={t.tableName} value={t.tableName}>{t.displayName}</option>
          ))}
        </select>
      </div>

      {selectedTable?.selectorType === 'MANUAL' && (
        <div className="flex flex-col">
          <label className="text-xs font-semibold mb-1 text-slate-700">
            {selectedTable.tableName === 'Template' ? 'TemplateId' : 'ID'}
          </label>
          <input
            type="text"
            className="border border-slate-300 rounded px-3 py-2 min-w-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder={selectedTable.manualPlaceholder}
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && canCompare) handleCompare(); }}
          />
        </div>
      )}

      {selectedTable?.selectorType === 'CONTEXT' && missing && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
          <span className="material-symbols-outlined text-[16px]">warning</span>
          <span>Falta seleccionar: <strong>{missing}</strong></span>
          <button
            onClick={onRequestContext}
            className="ml-2 text-blue-600 hover:text-blue-700 font-semibold underline"
          >
            Actualizar contexto
          </button>
        </div>
      )}

      <button
        onClick={handleCompare}
        disabled={!canCompare || isLoading}
        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded font-medium disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Comparando...' : 'Comparar'}
      </button>
    </div>
  );
}