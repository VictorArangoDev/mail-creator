// src/presentation/components/layout/ConnectionStatus.tsx
import { useEffect, useState } from 'react';

interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  environments: {
    TEST: string;
    PROD: string;
  };
  timestamp?: string;
}

export function ConnectionStatus() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/test-connection');
      const data: HealthResponse = await res.json();
      setHealth(data);
    } catch {
      setHealth({ status: 'error', environments: { TEST: 'caído', PROD: 'caído' } });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Refrescar cada 60 segundos
    const interval = setInterval(fetchHealth, 60_000);
    return () => clearInterval(interval);
  }, []);

  const isConnected = (env: string) => env === 'conectado';
  const testOk = health ? isConnected(health.environments.TEST) : false;
  const prodOk = health ? isConnected(health.environments.PROD) : false;
  const allOk = testOk && prodOk;

  return (
    <div className="flex items-center gap-2.5">
      {/* Sincronizador */}
      <div className="flex  items-center gap-2 text-[13px] text-[#51626B]">
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
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-full border border-[#DDE4E8] bg-[#F7F9FA] font-mono text-xs font-semibold text-[#0F1A1F]">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${testOk ? 'bg-[#12A5BA]' : 'bg-[#F07A2B]'}`}></span>
          <span>TEST</span>
          <span></span>
        </div>
        <span className="font-normal text-[#51626B]">
          {loading ? '...' : (testOk ? 'conectado' : 'caído')}
        </span>
      </div>

      {/* PROD */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-full border border-[#DDE4E8] bg-[#F7F9FA] font-mono text-xs font-semibold text-[#0F1A1F]">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${prodOk ? 'bg-[#1FA463]' : 'bg-[#F07A2B]'}`}></span>
          <span>PROD</span>
        </div>
        <span className="font-normal text-[#51626B]">
          {loading ? '...' : (prodOk ? 'conectado' : 'caído')}
        </span>
      </div>
    </div>
  );
}