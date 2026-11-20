import { useCartStore, type SyncDirection } from "../../../compared/presentation/useCartStore"; 

interface Props {
  compact?: boolean;
}

export function DirectionToggle({ compact = false }: Props) {
  const { direction, setDirection } = useCartStore();

  const options: Array<{ value: SyncDirection; label: string; sublabel: string }> = [
    { value: 'TEST_TO_PROD', label: 'TEST', sublabel: '→ PROD' },
    { value: 'PROD_TO_TEST', label: 'PROD', sublabel: '→ TEST' },
  ];

  return (
    <div className={`flex items-center gap-2 ${compact ? 'text-[11px]' : 'text-xs'}`}>
      <span className="text-slate-500 font-medium whitespace-nowrap">Dirección:</span>
      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
        {options.map(opt => {
          const isActive = direction === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setDirection(opt.value)}
              className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                isActive
                  ? opt.value === 'TEST_TO_PROD'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title={
                opt.value === 'TEST_TO_PROD'
                  ? 'Promover cambios de TEST a PROD'
                  : 'Revertir cambios de PROD a TEST'
              }
            >
              <span>{opt.label}</span>
              <span className="opacity-60">{opt.sublabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}