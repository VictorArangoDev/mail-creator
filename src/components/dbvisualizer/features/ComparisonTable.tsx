import { useState, useMemo } from 'react';
import type { ComparisonItem, ComparisonResult } from '../../../compared/domain/entities/ComparisonResult';

interface Props {
  result: ComparisonResult;
  onSelectionChange: (selected: ComparisonItem[]) => void;
}

const STATUS_CONFIG: Record<ComparisonItem['status'], { bg: string; text: string; dot: string; label: string, icon: string }> = {
  IGUAL: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Igual', icon: 'check_circle' },
  DIFERENTE: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'Diferente', icon: 'cancel' },
  NUEVO_EN_TEST: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-600', label: 'Nuevo (TEST)', icon: 'new_label' },
  NUEVO_EN_PROD: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-600', label: 'Nuevo (PROD)', icon: 'new_window' },
};

export function ComparisonTable({ result, onSelectionChange }: Props) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [onlyDiffs, setOnlyDiffs] = useState(false);

  const filteredItems = useMemo(() => {
    return onlyDiffs
      ? result.items.filter(i => i.status !== 'IGUAL')
      : result.items;
  }, [result.items, onlyDiffs]);

  const totalPages = Math.ceil(filteredItems.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + rowsPerPage);

  const toggleOne = (key: string) => {
    const next = new Set(selectedKeys);
    next.has(key) ? next.delete(key) : next.add(key);
    setSelectedKeys(next);
    onSelectionChange(result.items.filter(i => next.has(i.displayKey)));
  };

  const toggleAllVisible = () => {
    const visibleKeys = paginatedItems.map(i => i.displayKey);
    const allSelected = visibleKeys.every(k => selectedKeys.has(k));
    const next = new Set(selectedKeys);
    if (allSelected) visibleKeys.forEach(k => next.delete(k));
    else visibleKeys.forEach(k => next.add(k));
    setSelectedKeys(next);
    onSelectionChange(result.items.filter(i => next.has(i.displayKey)));
  };

  /**
   * Renderiza los valores de un lado (TEST o PROD).
   * - Columnas mostradas: SOLO las de `result.valueColumns`.
   * - Color:
   *   - Sin diferencia → gris neutro
   *   - Con diferencia + isTest → azul (fuente)
   *   - Con diferencia + !isTest → rojo tachado (destino a sobreescribir)
   */
  const renderValue = (item: ComparisonItem, isTest: boolean) => {
    const row = isTest ? item.testRaw : item.prodRaw;

    if (!row) {
      return (
        <span className="italic text-slate-400 font-mono text-[11px]">
          [No existe - en {isTest ? 'Test' : 'Producción'}]
        </span>
      );
    }

    // Solo mostramos las columnas configuradas como valueColumns
    const columns = result.valueColumns.filter(col => col in row);
    const diffFields = new Set(item.differences.map(d => d.field));

    return (
      <div className="bg-white border border-slate-200 rounded p-1.5 font-mono text-[11px] leading-relaxed space-y-1 min-w-0">
        {columns.map(col => {
          const rawValue = row[col];
          const value = rawValue === null || rawValue === undefined ? '—' : String(rawValue);
          const hasDiff = diffFields.has(col);

          if (!hasDiff) {
            return (
              <div key={col} className="flex gap-1 items-baseline min-w-0">
                <span className="text-slate-400 shrink-0">{col}:</span>
                <span className="text-slate-700 break-all">{value}</span>
              </div>
            );
          }

          // Con diferencia: TEST azul, PROD rojo tachado
          if (isTest) {
            return (
              <div key={col} className="flex gap-1 items-baseline min-w-0">
                <span className="text-blue-500 shrink-0">{col}:</span>
                <span className="bg-blue-100 text-blue-800 font-semibold px-1 rounded break-all">
                  {value}
                </span>
              </div>
            );
          }

          return (
            <div key={col} className="flex gap-1 items-baseline min-w-0">
              <span className="text-red-500 shrink-0">{col}:</span>
              <span className="bg-red-50 text-red-700 font-semibold px-1 rounded break-all">
                {value}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
      {/* --- HEADER --- */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-[17px]">difference</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900 leading-tight">{result.displayName}</h2>
              <span className="text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">dbo.{result.tableName}</span>
            </div>
            <span className="text-xs text-slate-500 mt-0.5">{result.filterColumn} = {String(result.filterValue)} • {filteredItems.length} registros evaluados</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-blue-50 text-blue-700 border border-blue-100 rounded-md font-medium text-xs px-2.5 py-1">
            {filteredItems.length} evaluados
          </span>
          <label className="h-7 px-2 bg-slate-50 hover:bg-slate-100 rounded-md border border-slate-200 flex items-center gap-1.5 cursor-pointer text-xs text-slate-600 transition-colors">
            <input
              checked={onlyDiffs}
              onChange={(e) => { setOnlyDiffs(e.target.checked); setCurrentPage(1); }}
              className="w-3 h-3 rounded text-blue-600 focus:ring-0 cursor-pointer"
              type="checkbox"
            />
            <span>Solo diffs</span>
          </label>
        </div>
      </div>



      {/* --- SELECTION BAR --- */}
      <div className="px-5 py-2.5 mt-3 bg-slate-50/70 border-y border-slate-100 flex items-center justify-between text-xs text-slate-600">
        <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
          <input
            className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 focus:ring-0 cursor-pointer"
            type="checkbox"
            checked={paginatedItems.length > 0 && paginatedItems.every(i => selectedKeys.has(i.displayKey))}
            onChange={toggleAllVisible}
          />
          <span>Seleccionar visibles ({paginatedItems.filter(i => selectedKeys.has(i.displayKey)).length} de {paginatedItems.length})</span>
        </label>
        <div className="flex items-center gap-3 text-slate-500 font-mono text-[11px]">
          <span>Página {currentPage} de {totalPages || 1}</span>
        </div>
      </div>

      {/* --- TABLE --- */}
      <div className="w-full overflow-hidden">
        <table className="w-full table-fixed text-left text-xs">
          <colgroup>
            <col className="w-8" />
            <col className="w-24" />
            <col className="w-20" />
            <col />
            <col />
            <col className="w-10" />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-semibold tracking-wider uppercase text-[11px] bg-white">
              <th className="py-2.5 pl-4 pr-1"></th>
              <th className="py-2.5 px-2">ESTADO</th>
              <th className="py-2.5 px-2 font-mono">{result.keyColumn}</th>
              <th className="py-2.5 px-3">
                <div className="flex items-center gap-1 text-blue-600 font-semibold">
                  <span className="material-symbols-outlined text-[13px]">arrow_outward</span>
                  <span>TEST_STAGING</span>
                </div>
              </th>
              <th className="py-2.5 px-3">
                <div className="flex items-center gap-1 text-slate-700 font-semibold">
                  <span className="material-symbols-outlined text-[13px]">south_east</span>
                  <span>PROD_PRIMARY</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {paginatedItems.map(item => {
              const style = STATUS_CONFIG[item.status];
              const isSelected = selectedKeys.has(item.displayKey);
              return (
                <tr key={item.displayKey} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-blue-50/30' : ''}`}>
                  <td className="py-3 pl-4 pr-1 align-top">
                    <input
                      checked={isSelected}
                      onChange={() => toggleOne(item.displayKey)}
                      className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 focus:ring-0 cursor-pointer mt-1"
                      type="checkbox"
                    />
                  </td>
                  <td className="py-3 px-2 align-top">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-medium text-[11px] ${style.bg} ${style.text}`}>
                      <span className="material-symbols-outlined text-[12px] leading-none">
                        {style.icon}
                      </span>
                      {style.label}
                    </span>
                  </td>
                  <td className={`py-3 px-2 align-top font-mono font-bold break-all ${item.status === 'DIFERENTE' ? 'text-slate-900' : 'text-slate-600'}`}>
                    {item.displayKey}
                  </td>
                  <td className="py-3 px-3 align-top min-w-0">
                    {renderValue(item, true)}
                  </td>
                  <td className="py-3 px-3 align-top min-w-0">
                    {renderValue(item, false)}
                  </td>
                </tr>
              );
            })}
            {paginatedItems.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                  No hay resultados con los filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- PAGINATION FOOTER --- */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span>Filas:</span>
          <select
            className="bg-white border border-slate-200 text-slate-700 px-2 py-1 rounded text-xs focus:outline-none"
            value={rowsPerPage}
            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>Mostrando {filteredItems.length === 0 ? 0 : startIndex + 1} - {Math.min(startIndex + rowsPerPage, filteredItems.length)} de {filteredItems.length}</span>
        </div>
        <div className="flex items-center gap-1 font-medium">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Anterior
          </button>
          <button className="w-7 h-7 rounded bg-blue-600 text-white font-semibold">{currentPage}</button>
          {currentPage < totalPages && (
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            >
              Siguiente
            </button>
          )}
        </div>
      </div>
    </section>
  );
}