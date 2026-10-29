import type { ComparisonStats } from "../../../compared/domain/entities/ComparisonResult"; 

interface Props {
  stats: ComparisonStats | null;
  selectedCount: number;
}

export function StatsCards({ stats, selectedCount }: Props) {
  const cards = [
    { label: 'Total TEST', value: stats?.totalTest ?? 0, color: 'bg-blue-50 text-blue-700 border-blue-100' },
    { label: 'Total PROD', value: stats?.totalProd ?? 0, color: 'bg-purple-50 text-purple-700 border-purple-100' },
    { label: 'Iguales', value: stats?.iguales ?? 0, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    { label: 'Diferentes', value: stats?.diferentes ?? 0, color: 'bg-amber-50 text-amber-700 border-amber-100' },
    { label: 'Nuevos en TEST', value: stats?.nuevosEnTest ?? 0, color: 'bg-cyan-50 text-cyan-700 border-cyan-100' },
    { label: 'Seleccionados', value: selectedCount, color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map(card => (
        <div
          key={card.label}
          className={`rounded-xl border p-4 ${card.color}`}
        >
          <div className="text-xs font-medium opacity-80">{card.label}</div>
          <div className="text-2xl font-bold mt-1">{card.value}</div>
        </div>
      ))}
    </div>
  );
}