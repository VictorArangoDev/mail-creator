import { useState, useEffect } from 'react';
import { CustomerAutocomplete } from '../ui/CustomerAutocomplete';
import type { CustomerOption , ProductOption } from '../../../compared/domain/ports/ICatalogRepository'    

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
    <div className="flex flex-wrap gap-3 items-end p-4 bg-white rounded-xl shadow-sm border border-slate-200">

      {/* Tabla */}
      <div className="flex flex-col">
        <label className="text-xs font-semibold mb-1 text-slate-700">Tabla</label>
        <select
          className="border border-slate-300 rounded px-3 py-2 min-w-[240px] focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
      </div>

      {/* Customer (NIT) */}
      {selectedTable && (selectedTable.selectorType === 'PRODUCT' || selectedTable.selectorType === 'CUSTOMER') && (
        <CustomerAutocomplete onSelect={(c) => setCustomer(c)} />
      )}

      {/* Product */}
      {selectedTable?.selectorType === 'PRODUCT' && (
        <div className="flex flex-col">
          <label className="text-xs font-semibold mb-1 text-slate-700">Producto</label>
          <select
            className="border border-slate-300 rounded px-3 py-2 min-w-[280px] disabled:opacity-50 disabled:bg-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
        </div>
      )}

      {/* Manual */}
      {selectedTable?.selectorType === 'MANUAL' && (
        <div className="flex flex-col">
          <label className="text-xs font-semibold mb-1 text-slate-700">ID</label>
          <input
            type="text"
            className="border border-slate-300 rounded px-3 py-2 min-w-[180px] focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder={selectedTable.manualPlaceholder}
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
          />
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