import { useState, useEffect, useRef } from 'react';
import type { CustomerOption } from '../../../compared/domain/ports/ICatalogRepository'; 

interface Props {
  onSelect: (customer: CustomerOption | null) => void;
}

export function CustomerAutocomplete({ onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<CustomerOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<CustomerOption | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);

  // Cargar primeros 50 al montar (para que el usuario vea opciones de entrada)
  useEffect(() => {
    if (selected) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/catalogs/customers?q=${encodeURIComponent(query)}`);
        const data: CustomerOption[] = await res.json();
        setOptions(data);
        setIsOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [query, selected]);

  const handleSelect = (opt: CustomerOption) => {
    setSelected(opt);
    setQuery(opt.label);
    setIsOpen(false);
    onSelect(opt);
  };

  const handleClear = () => {
    setSelected(null);
    setQuery('');
    onSelect(null);
  };

  return (
    <div className="flex flex-col relative">
      <div className="flex items-center justify-between">
            <label className="text-xs font-semibold tracking-wider text-slate-700">
              CUSTOMER (NIT) <span className="text-red-500">*</span>
            </label>
          </div>
      <div className="flex gap-1 relative">
        <input
          type="text"
          className="w-full pl-8 pr-7 h-9 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-code-cell text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          placeholder="Buscar por NIT o nombre (ej: 890904996 o EPM)"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
          onFocus={() => { if (options.length && !selected) setIsOpen(true); }}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        />
        {selected && (
          <button
            onClick={handleClear}
            className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors" 
            title="Limpiar filtro"
          >✕</button>
        )}
      </div>
      {loading && (
        <div className="text-xs text-slate-400 mt-1">Buscando...</div>
      )}
      {isOpen && options.length > 0 && !selected && (
        <ul className="absolute top-full left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto bg-white border border-slate-200 rounded shadow-lg">
          {options.map(opt => (
            <li
              key={opt.nit}
              className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
              onMouseDown={() => handleSelect(opt)}
            >
              <div className="font-medium text-slate-800">{opt.name}</div>
              <div className="text-xs text-slate-500">NIT: {opt.nit}</div>
            </li>
          ))}
        </ul>
      )}
      {isOpen && options.length === 0 && !loading && query && (
        <div className="absolute top-full left-0 mt-1 bg-white border rounded shadow px-3 py-2 text-sm text-slate-500">
          Sin resultados
        </div>
      )}
    </div>
  );
}
