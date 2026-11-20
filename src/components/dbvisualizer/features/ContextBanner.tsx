import { useState } from 'react';
import { useContextStore } from '../../../compared/presentation/useContextStore'; 
import { ContextSelectorModal } from './ContextSelectorModal';

export function ContextBanner() {
  const { context, clearFrom } = useContextStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const hasContext = context.customer || context.product;

  if (!hasContext) {
    return (
      <>
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
              <span className="material-symbols-outlined">filter_alt</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Selecciona un contexto</h3>
              <p className="text-xs text-slate-500">
                Elige Customer → Product → (opcional) SubProduct / Resource
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Seleccionar contexto
          </button>
        </div>
        {isModalOpen && <ContextSelectorModal onClose={() => setIsModalOpen(false)} />}
      </>
    );
  }

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-2 shadow-sm">
        <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">pin_drop</span>
          Contexto
        </span>

        {context.customer && (
          <ContextChip
            label={context.customer.name}
            sub={context.customer.nit}
            onClear={() => clearFrom('customer')}
            color="emerald"
          />
        )}

        {context.product && (
          <>
            <span className="material-symbols-outlined text-slate-300 text-[16px]">chevron_right</span>
            <ContextChip
              label={context.product.name}
              sub={String(context.product.productId)}
              onClear={() => clearFrom('product')}
              color="blue"
            />
          </>
        )}

        {(context.subProduct || context.resource) && (
          <>
            <span className="material-symbols-outlined text-slate-300 text-[16px]">chevron_right</span>
            <div className="flex items-center gap-2 flex-wrap">
              {context.subProduct && (
                <ContextChip
                  label={context.subProduct.name}
                  sub={String(context.subProduct.subProductId)}
                  onClear={() => clearFrom('subProduct')}
                  color="violet"
                  icon="account_tree"
                />
              )}
              {context.resource && (
                <ContextChip
                  label={context.resource.space}
                  sub={String(context.resource.resourcesId)}
                  onClear={() => clearFrom('resource')}
                  color="amber"
                  icon="folder_open"
                />
              )}
            </div>
          </>
        )}

        <button
          onClick={() => setIsModalOpen(true)}
          className="ml-auto text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[16px]">edit</span>
          Modificar
        </button>
      </div>
      {isModalOpen && <ContextSelectorModal onClose={() => setIsModalOpen(false)} />}
    </>
  );
}

function ContextChip({
  label, sub, onClear, color, icon,
}: {
  label: string;
  sub: string;
  onClear: () => void;
  color: 'emerald' | 'blue' | 'violet' | 'amber';
  icon?: string;
}) {
  const colorClasses = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  }[color];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs ${colorClasses}`}>
      {icon && <span className="material-symbols-outlined text-[14px]">{icon}</span>}
      <span className="font-semibold">{label}</span>
      <span className="font-mono text-[10px] opacity-70">{sub}</span>
      <button onClick={onClear} className="ml-0.5 hover:opacity-70" title="Quitar">
        <span className="material-symbols-outlined text-[14px]">close</span>
      </button>
    </span>
  );
}