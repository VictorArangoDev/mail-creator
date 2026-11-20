// src/presentation/components/layout/ConnectionStatus.tsx
import { useEffect, useState } from 'react';
import { useEnvironmentStore } from '../../../compared/presentation/hooks/useEnvironmentStore'; 

interface EnvHealth {
  id: string;
  label: string;
  connected: boolean;
  latencyMs?: number;
  error?: string;
}

interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  environments: {
    TEST: EnvHealth;
    PROD: EnvHealth;
  };
  timestamp?: string;
}

export function ConnectionStatus() {
  const { selection } = useEnvironmentStore();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      const res = await fetch(
        `/api/test-connection?sourceId=${selection.sourceId}&targetId=${selection.targetId}`
      );
      const data: HealthResponse = await res.json();
      setHealth(data);
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 60_000);
    return () => clearInterval(interval);
  }, [selection.sourceId, selection.targetId]);   // ← re-fetch al cambiar entorno

  const testOk = health?.environments.TEST?.connected ?? false;
  const prodOk = health?.environments.PROD?.connected ?? false;
  const allOk = testOk && prodOk;

  return (
    <div className="flex items-center gap-2.5">
      {/* Sincronizador */}
      <div className="flex items-center gap-2 text-[13px] text-[#51626B]">
        <span
          className={`w-2 h-2 rounded-full ${
            loading ? 'bg-amber-400 animate-pulse' : (allOk ? 'bg-[#1FA463]' : 'bg-[#F07A2B]')
          }`}
        ></span>
        <span>
          {loading ? 'Verificando Conexión...' : (allOk ? 'Conexión activa' : 'Conexión parcial')}
        </span>
      </div>

      {/* TEST */}
      <div
        className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-full border border-[#DDE4E8] bg-[#F7F9FA] font-mono text-xs font-semibold text-[#0F1A1F]"
        title={health?.environments.TEST?.id ?? ''}
      >
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${testOk ? 'bg-[#12A5BA]' : 'bg-[#F07A2B]'}`}></span>
          <span>{health?.environments.TEST?.label ?? 'TEST'}</span>
        </div>
        <span className="font-normal text-[#51626B]">
          {loading ? '...' : (testOk ? 'conectado' : 'caído')}
        </span>
      </div>

      {/* PROD */}
      <div
        className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-full border border-[#DDE4E8] bg-[#F7F9FA] font-mono text-xs font-semibold text-[#0F1A1F]"
        title={health?.environments.PROD?.id ?? ''}
      >
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${prodOk ? 'bg-[#1FA463]' : 'bg-[#F07A2B]'}`}></span>
          <span>{health?.environments.PROD?.label ?? 'PROD'}</span>
        </div>
        <span className="font-normal text-[#51626B]">
          {loading ? '...' : (prodOk ? 'conectado' : 'caído')}
        </span>
      </div>
    </div>
  );
}