import type { APIRoute } from 'astro';
import { SqlServerTableRepository } from '../../compared/infrastructure/repositories/SqlServerTableRepository'; 
import { getEnvironment, resolveConnectionEnv, AVAILABLE_ENVIRONMENTS } from '../../compared/domain/config/environments';


export const GET: APIRoute = async ({ url }) => {
  const sourceId = url.searchParams.get('sourceId') ?? 'MDEPYD01NEW';
  const targetId = url.searchParams.get('targetId') ?? 'PROJECT5X';

  const sourceEnv = getEnvironment(sourceId);
  const targetEnv = getEnvironment(targetId);

  if (!sourceEnv || !targetEnv) {
    return new Response(
      JSON.stringify({
        status: 'error',
        error: `Entorno inválido: source=${sourceId} target=${targetId}`,
        environments: {
          TEST: { id: sourceId, label: sourceId, connected: false },
          PROD: { id: targetId, label: targetId, connected: false },
        },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const repo = new SqlServerTableRepository();

  const [testResult, prodResult] = await Promise.all([
    testEnv(repo, sourceEnv),
    testEnv(repo, targetEnv),
  ]);

  const allOk = testResult.connected && prodResult.connected;

  return new Response(
    JSON.stringify({
      status: allOk ? 'ok' : 'degraded',
      environments: {
        TEST: testResult,
        PROD: prodResult,
      },
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};

async function testEnv(
  repo: SqlServerTableRepository,
  env: { id: string; label: string; connectionEnv: string }
) {
  try {
    const start = Date.now();
    const connected = await repo.testConnection(
      resolveConnectionEnv(env.id) as any
    );
    return {
      id: env.id,
      label: env.label,
      connected,   // ← boolean
      latencyMs: Date.now() - start,
    };
  } catch (err: any) {
    return {
      id: env.id,
      label: env.label,
      connected: false,
      error: err.message,
    };
  }
}