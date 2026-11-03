import { useState, useEffect } from 'react';
import { CustomerAutocomplete } from '../ui/CustomerAutocomplete';
import type { CustomerOption, ProductOption } from '../../../compared/domain/ports/ICatalogRepository'

export type TableDefLite = {
  tableName: string;
  displayName: string;
  selectorType: 'PRODUCT' | 'CUSTOMER' | 'MANUAL';
  manualPlaceholder?: string;
};

interface Props {
  tables: TableDefLite[];
  onCompare: (params: {
    table: string;
    filter: string | number;
    context: { customer?: CustomerOption; product?: ProductOption };
  }) => void;
  isLoading?: boolean;
}

export function ComparisonFilterBar({ tables, onCompare, isLoading = false }: Props) {
  const [selectedTable, setSelectedTable] = useState<TableDefLite | null>(null);
  const [customer, setCustomer] = useState<CustomerOption | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [product, setProduct] = useState<ProductOption | null>(null);
  const [manualValue, setManualValue] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Cuando cambia el customer, cargamos productos por NIT
  useEffect(() => {
    setProduct(null);
    if (!customer) { setProducts([]); return; }
    setLoadingProducts(true);
    fetch(`/api/catalogs/products?nit=${encodeURIComponent(customer.nit)}`)
      .then(r => r.json())
      .then((data: ProductOption[]) => setProducts(data))
      .finally(() => setLoadingProducts(false));
  }, [customer]);

  const canCompare = (() => {
    if (!selectedTable) return false;
    if (selectedTable.selectorType === 'PRODUCT') return !!product;
    if (selectedTable.selectorType === 'CUSTOMER') return !!customer;
    if (selectedTable.selectorType === 'MANUAL') return manualValue.trim() !== '';
    return false;
  })();

  const handleCompare = () => {
    if (!selectedTable) return;
    let filter: string | number = '';
    if (selectedTable.selectorType === 'PRODUCT') filter = product!.productId;
    if (selectedTable.selectorType === 'CUSTOMER') filter = customer!.nit;
    if (selectedTable.selectorType === 'MANUAL') {
      filter = /^\d+$/.test(manualValue) ? Number(manualValue) : manualValue;
    }
    onCompare({
      table: selectedTable.tableName,
      filter,
      context: { customer: customer ?? undefined, product: product ?? undefined },
    });
  };

  return (

    <section className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col gap-4 relative">
      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-[16px]">tune</span>
          </div>
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">PARÁMETROS DE COMPARACIÓN</h2>
        </div>
        <span className="text-xs text-slate-400">Todos los filtros requeridos (*)</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">

        <div className="md:col-span-4 flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-wider text-slate-700 flex items-center gap-1">
            TABLA CONFIGURACIÓN <span className="text-red-500">*</span>
          </label>

          <div className="relative">

            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-code-cell text-xs h-9 px-3 pr-8 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
              value={selectedTable?.tableName || ''}
              onChange={(e) => {
                const t = tables.find(x => x.tableName === e.target.value) || null;
                console.log(`Tabla seleccionada: ${t}`)
                setSelectedTable(t);
                setCustomer(null); setProduct(null); setManualValue('');
              }}
            >
              <option value="">-- Selecciona una tabla --</option>
              {tables.map(t => (
                <option key={t.tableName} value={t.tableName}>{t.displayName}</option>
              ))}
            </select>

            <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-slate-400 text-[18px] pointer-events-none">expand_more</span>
          </div>
        </div>

        <div className="md:col-span-3 flex flex-col gap-1.5">
          {/* Customer (NIT) */}
          {selectedTable && (selectedTable.selectorType === 'PRODUCT' || selectedTable.selectorType === 'CUSTOMER') && (
            <CustomerAutocomplete onSelect={(c) => setCustomer(c)} />
          )}
        </div>
        {selectedTable?.selectorType === 'PRODUCT' && (
          <div className="md:col-span-3 flex flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-wider text-slate-700">
              PRODUCTO (DESTINO) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-code-cell text-xs h-9 px-3 pr-8 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                value={product?.productId ?? ''}
                onChange={(e) => {
                  const p = products.find(x => String(x.productId) === e.target.value) || null;
                  setProduct(p);
                }}
                disabled={!customer || loadingProducts}
              >
                <option value="">
                  {loadingProducts ? 'Cargando productos...' : !customer ? '-- Primero elige un Customer --' : '-- Selecciona un producto --'}
                </option>
                {products.map(p => (
                  <option key={p.productId} value={String(p.productId)}>{p.label}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-slate-400 text-[18px] pointer-events-none">expand_more</span>
            </div>
          </div>
        )}

        <div className="md:col-span-2 flex items-center gap-2 absolute right-2 w-[150px]">
          <button className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            onClick={handleCompare}
            disabled={!canCompare || isLoading}
          >
            <span className="material-symbols-outlined text-[16px]">sync</span>
            {isLoading ? 'Comparando...' : 'Comparar'}
          </button>

        </div>
      </div>
    </section>

  );
}