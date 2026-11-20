import { useState, useEffect } from 'react';

import {
  AVAILABLE_ENVIRONMENTS,
  getLinkedServerAlias,
  type EnvironmentDefinition,
} from '../../../compared/domain/config/environments';
import { useEnvironmentStore } from '../../../compared/presentation/hooks/useEnvironmentStore';

export function EnvironmentConfig() {
  const { selection, setSelection, reset } = useEnvironmentStore();

  const [sourceId, setSourceId] = useState(selection.sourceId);
  const [targetId, setTargetId] = useState(selection.targetId);
  const [saved, setSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // ⬇️ Sincronizar el state local con el store cuando se hidrata o cambia
  useEffect(() => {
    setSourceId(selection.sourceId);
    setTargetId(selection.targetId);
    setHydrated(true);
  }, [selection.sourceId, selection.targetId]);

  const sourceEnv = AVAILABLE_ENVIRONMENTS.find(e => e.id === sourceId);
  const targetEnv = AVAILABLE_ENVIRONMENTS.find(e => e.id === targetId);
  const linkedServerAlias = targetEnv ? getLinkedServerAlias(targetEnv.id) : undefined;

  const canSave = hydrated && sourceId !== targetId && !!sourceEnv && !!targetEnv;

  const handleSave = () => {
    console.log('🔍 Guardando selección:', { sourceId, targetId });
    setSelection({ sourceId, targetId });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    reset();
    setSourceId('MDEPYD01NEW');
    setTargetId('PROJECT5X');
  };

  if (!hydrated) {
    return (
      <div className="flex items-center gap-2 text-slate-500 text-sm p-6">
        <span className="material-symbols-outlined animate-spin">refresh</span>
        Cargando configuración...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ENTORNOS */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-600">dns</span>
          Selección de entornos
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Origen */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Origen (TEST)
            </label>
            <div className="space-y-2">
              {AVAILABLE_ENVIRONMENTS.filter(e => e.role === 'TEST').map(env => (
                <EnvCard
                  key={`source-${env.id}`}
                  env={env}
                  selected={sourceId === env.id}
                  disabled={targetId === env.id}
                  onClick={() => setSourceId(env.id)}
                  color="blue"
                />
              ))}
            </div>
          </div>

          {/* Destino */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Destino (PROD)
            </label>
            <div className="space-y-2">
              {AVAILABLE_ENVIRONMENTS.filter(e => e.role === 'PROD').map(env => (
                <EnvCard
                  key={`target-${env.id}`}
                  env={env}
                  selected={targetId === env.id}
                  disabled={sourceId === env.id}
                  onClick={() => setTargetId(env.id)}
                  color="amber"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* LINKED SERVER */}
      {linkedServerAlias && (
        <section className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-blue-600 mt-0.5">info</span>
            <div className="text-sm">
              <div className="font-semibold text-slate-800 mb-1">
                Linked server resuelto automáticamente
              </div>
              <div className="text-slate-600">
                Para el destino <strong>{targetEnv?.label}</strong>, el script usará el linked server:
              </div>
              <code className="inline-block mt-2 bg-white border border-blue-200 rounded px-2 py-1 font-mono text-xs text-blue-700">
                {linkedServerAlias}.{sourceEnv?.database}.dbo
              </code>
              <div className="text-xs text-slate-500 mt-2">
                Este alias se usa solo en tablas con <code>updateStrategy: COMPOSITE_KEY</code> (Template, FileSchemas, FilesByProduct, Resources).
              </div>
            </div>
          </div>
        </section>
      )}

      {/* PREVIEW */}
      {canSave && sourceEnv && targetEnv && (
        <section className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">preview</span>
            Vista previa
          </h3>
          <div className="font-mono text-xs text-slate-700 space-y-1">
            <div>Origen: <span className="text-blue-600 font-bold">{sourceEnv.server}</span> ({sourceEnv.database})</div>
            <div>Destino: <span className="text-amber-600 font-bold">{targetEnv.server}</span> ({targetEnv.database})</div>
            {linkedServerAlias && (
              <div>Linked Server: <span className="text-slate-800 font-bold">{linkedServerAlias}</span></div>
            )}
          </div>
        </section>
      )}

      {/* ACCIONES */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={handleReset}
          className="text-slate-500 hover:text-slate-700 text-sm font-medium flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[16px]">restart_alt</span>
          Restaurar valores por defecto
        </button>

        <button
          onClick={handleSave}
          disabled={!canSave}
          className={`px-6 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${saved
            ? 'bg-emerald-600 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-300 disabled:cursor-not-allowed'
            }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {saved ? 'check' : 'save'}
          </span>
          {saved ? '¡Guardado!' : 'Guardar configuración'}
        </button>
      </div>
    </div>
  );
}

function EnvCard({
  env, selected, disabled, onClick, color,
}: {
  env: EnvironmentDefinition;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
  color: 'blue' | 'amber';
}) {
  const colorClasses = selected
    ? color === 'blue'
      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
      : 'border-amber-500 bg-amber-50 ring-2 ring-amber-200'
    : 'border-slate-200 bg-white hover:border-slate-300';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${colorClasses} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
        }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm text-slate-800 truncate">{env.label}</div>
          <div className="text-xs text-slate-500 font-mono truncate">{env.server}</div>
          <div className="text-xs text-slate-400 mt-1">{env.description}</div>
        </div>
        {selected && (
          <span className="material-symbols-outlined text-[20px] text-emerald-600 shrink-0">
            check_circle
          </span>
        )}
      </div>
    </button>
  );
}