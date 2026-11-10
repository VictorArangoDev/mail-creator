import { useState, useEffect } from 'react';
import { useContextStore } from '../../../compared/presentation/useContextStore'; 
import { CustomerAutocomplete } from '../ui/CustomerAutocomplete';
import type { CustomerOption, ProductOption } from '../../../compared/domain/ports/ICatalogRepository'; 
interface Props {
  onClose: () => void;
}

export function ContextSelectorModal({ onClose }: Props) {
  const { context, setCustomer, setProduct, setSubProduct, setResource } = useContextStore();

  const [customer, setLocalCustomer] = useState<CustomerOption | null>(
    context.customer
      ? { nit: context.customer.nit, name: context.customer.name, description: '', label: `${context.customer.nit} - ${context.customer.name}` }
      : null
  );
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [product, setLocalProduct] = useState<ProductOption | null>(
    context.product
      ? { productId: context.product.productId, customerNit: context.product.customerNit, name: context.product.name, description: '', type: null, label: context.product.name }
      : null
  );

  const [subProducts, setSubProducts] = useState<any[]>([]);
  const [subProductId, setSubProductId] = useState<number | null>(context.subProduct?.subProductId ?? null);

  const [resources, setResources] = useState<any[]>([]);
  const [resourcesId, setResourcesId] = useState<number | null>(context.resource?.resourcesId ?? null);

  useEffect(() => {
    if (!customer) {
      setProducts([]);
      setLocalProduct(null);
      return;
    }
    fetch(`/api/catalogs/products?nit=${encodeURIComponent(customer.nit)}`)
      .then(r => r.json())
      .then(setProducts);
  }, [customer]);

  useEffect(() => {
    if (!product) {
      setSubProducts([]);
      setResources([]);
      setSubProductId(null);
      setResourcesId(null);
      return;
    }

    Promise.all([
      fetch(`/api/catalogs/subproducts?productId=${product.productId}`).then(r => r.json()),
      fetch(`/api/catalogs/resources?productId=${product.productId}`).then(r => r.json()),
    ]).then(([subs, res]) => {
      setSubProducts(Array.isArray(subs) ? subs : []);
      setResources(Array.isArray(res) ? res : []);
    }).catch(() => {
      setSubProducts([]);
      setResources([]);
    });
  }, [product]);

  const handleSave = () => {
    setCustomer(customer ? { nit: customer.nit, name: customer.name } : null);
    setProduct(
      product
        ? { productId: product.productId, name: product.name, customerNit: product.customerNit }
        : null
    );

    const sp = subProducts.find(s => s.SubProductId === subProductId);
    setSubProduct(sp ? { subProductId: sp.SubProductId, name: sp.Name, productId: sp.ProductId } : null);

    const rs = resources.find(r => r.ResourcesId === resourcesId);
    setResource(rs ? { resourcesId: rs.ResourcesId, space: rs.Space, productId: rs.ProductId } : null);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-slate-800">Seleccionar contexto</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <CustomerAutocomplete onSelect={setLocalCustomer} />

          {customer && (
            <div className="flex flex-col">
              <label className="text-xs font-semibold mb-1 text-slate-700">Producto *</label>
              <select
                className="border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={product?.productId ?? ''}
                onChange={(e) => {
                  const p = products.find(x => String(x.productId) === e.target.value) || null;
                  setLocalProduct(p);
                }}
              >
                <option value="">-- Selecciona --</option>
                {products.map(p => (
                  <option key={p.productId} value={String(p.productId)}>{p.label}</option>
                ))}
              </select>
            </div>
          )}

          {product && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div className="flex flex-col">
                <label className="text-xs font-semibold mb-1 text-slate-700 flex items-center gap-1">
                  <span className="material-symbols-outlined text-violet-500 text-[14px]">account_tree</span>
                  SubProducto
                  <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <select
                  className="border border-slate-300 rounded px-3 py-2 text-sm disabled:opacity-50"
                  value={subProductId ?? ''}
                  onChange={(e) => setSubProductId(e.target.value ? Number(e.target.value) : null)}
                  disabled={subProducts.length === 0}
                >
                  <option value="">
                    {subProducts.length === 0 ? 'Sin subproductos' : '-- Ninguno --'}
                  </option>
                  {subProducts.map((s: any) => (
                    <option key={s.SubProductId} value={s.SubProductId}>{s.Name}</option>
                  ))}
                </select>
              </div>

             
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!customer || !product}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Guardar contexto
          </button>
        </div>
      </div>
    </div>
  );
}