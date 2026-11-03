import type { ComparisonStats } from "../../../compared/domain/entities/ComparisonResult";

interface Props {
  stats: ComparisonStats | null;
  selectedCount: number;
}

export function StatsCards({ stats, selectedCount }: Props) {
  const cards = [
    {label: 'Total TEST',value: stats?.totalTest ?? 0,color: 'bg-blue-50 text-blue-700 border-blue-100',icon: 'database_search',iconColor: 'text-blue-600',bar: 'bg-blue-600',},
    {label: 'Total PROD',value: stats?.totalProd ?? 0,color: 'bg-purple-50 text-purple-700 border-purple-100',icon: 'database_upload',iconColor: 'text-purple-600',bar: 'bg-purple-600',},
    {label: 'Iguales',value: stats?.iguales ?? 0,color: 'bg-emerald-50 text-emerald-700 border-emerald-100',icon: 'equal',iconColor: 'text-emerald-600',bar: 'bg-emerald-600',},
    {label: 'Diferentes',value: stats?.diferentes ?? 0,color: 'bg-amber-50 text-amber-700 border-amber-100',icon: 'compare_arrows',iconColor: 'text-amber-600',bar: 'bg-amber-600',},
    {label: 'Nuevos en TEST',value: stats?.nuevosEnTest ?? 0,color: 'bg-cyan-50 text-cyan-700 border-cyan-100',icon: 'new_label',iconColor: 'text-cyan-600',bar: 'bg-cyan-600',},
    {label: 'Seleccionados',value: selectedCount,color: 'bg-indigo-50 text-indigo-700 border-indigo-100',icon: 'select_check_box',iconColor: 'text-indigo-600',bar: 'bg-indigo-600',},
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {cards.map(card => (
        <div
          key={card.label}
          className={`rounded-xl border shadow-xs p-3.5 flex flex-col justify-between ${card.color} transition-colors`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider">{card.label}</span>
            <span className={`material-symbols-outlined text-[18px] ${card.iconColor}`}>
              {card.icon}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-900">{card.value}</span>
            <span className="text-xs text-slate-400">filas</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className={`${card.bar} h-full rounded-full w-full opacity-80`}></div>
          </div>
        </div>
      ))}
    </div>
  );
}