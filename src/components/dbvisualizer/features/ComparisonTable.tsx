import { useState } from 'react';
import type { ComparisonItem } from '../../../compared/domain/entities/ComparisonResult';

interface Props {
  items: ComparisonItem[];
  onSelectionChange: (selected: ComparisonItem[]) => void;
  testLabel?: string;
  prodLabel?: string;
}

const STATUS_STYLES: Record<ComparisonItem['status'], { bg: string; text: string; label: string }> = {
  IGUAL:          { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Igual' },
  DIFERENTE:      { bg: 'bg-amber-100',   text: 'text-amber-800',   label: 'Diferente' },
  NUEVO_EN_TEST:  { bg: 'bg-blue-100',    text: 'text-blue-800',    label: 'Nuevo en TEST' },
  NUEVO_EN_PROD:  { bg: 'bg-rose-100',    text: 'text-rose-800',    label: 'Nuevo en PROD' },
};

export function ComparisonTable({ items, onSelectionChange, testLabel = 'TEST', prodLabel = 'PROD' }: Props) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const toggleOne = (key: string) => {
    const next = new Set(selectedKeys);
    next.has(key) ? next.delete(key) : next.add(key);
    setSelectedKeys(next);
    onSelectionChange(items.filter(i => next.has(i.displayKey)));
  };

  const toggleAll = () => {
    if (selectedKeys.size === items.length) {
      setSelectedKeys(new Set());
      onSelectionChange([]);
    } else {
      const all = new Set(items.map(i => i.displayKey));
      setSelectedKeys(all);
      onSelectionChange(items);
    }
  };

  // Renderizar el valor de un row permitiendo que quiebre líneas largas hacia abajo
  const renderValue = (row: Record<string, unknown> | null) => {
    if (!row) return <span className="text-slate-400 italic">No existe</span>;
    const entries = Object.entries(row).filter(([k]) =>
      !['SettingsByProductId', 'ProductId', 'CustomerNit'].includes(k)
    );
    return (
      <div className="space-y-1 text-xs font-mono">
        {entries.map(([k, v]) => (
          <div key={k} className="break-all">
            <span className="text-slate-500 font-semibold">{k}:</span>{' '}
            <span className="text-slate-800">{String(v ?? '—')}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header con "seleccionar todos" */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedKeys.size === items.length && items.length > 0}
            onChange={toggleAll}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          Seleccionar todos los visibles ({items.length})
        </label>
        <div className="text-sm text-slate-500">
          {selectedKeys.size} seleccionados
        </div>
      </div>

      {/* Tabla optimizada para evitar scroll horizontal forzado */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-12" />      {/* Checkbox */}
            <col className="w-32" />      {/* Estado */}
            <col className="w-20" />      {/* Llave */}
            <col className="w-36" />      {/* Diferencias */}
            <col className="w-auto" />     {/* TEST (Fluido) */}
            <col className="w-auto" />     {/* PROD (Fluido) */}
          </colgroup>
          <thead className="bg-slate-100 text-slate-600 text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left"></th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2 text-left">Llave</th>
              <th className="px-3 py-2 text-left">Diferencias</th>
              <th className="px-3 py-2 text-left">{testLabel}</th>
              <th className="px-3 py-2 text-left">{prodLabel}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map(item => {
              const style = STATUS_STYLES[item.status];
              const isSelected = selectedKeys.has(item.displayKey);
              return (
                <tr
                  key={item.displayKey}
                  className={`hover:bg-slate-50 transition-colors align-top ${isSelected ? 'bg-blue-50/50' : ''}`}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(item.displayKey)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-1"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
                      {style.label}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-700 break-all">
                    {item.displayKey}
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-600 break-words">
                    {item.differences.length === 0 ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <span>{item.differences.map(d => d.field).join(', ')}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 max-w-xs md:max-w-md">
                    {renderValue(item.testRaw)}
                  </td>
                  <td className="px-3 py-3 max-w-xs md:max-w-md">
                    {renderValue(item.prodRaw)}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                  No hay resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}