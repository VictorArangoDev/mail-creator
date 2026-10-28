
import type { APIRoute } from 'astro';
import { SqlServerTableRepository } from '../../compared/infrastructure/repositories/SqlServerTableRepository'; 

export const GET: APIRoute = async () => {
  const repo = new SqlServerTableRepository();

  try {
    // Solo probamos que ambos entornos respondan
    const [testOk, prodOk] = await Promise.all([
      repo.testConnection('TEST'),
      repo.testConnection('PROD'),
    ]);

    const allOk = testOk && prodOk;

    return new Response(JSON.stringify({
      status: allOk ? 'ok' : 'degraded',
      environments: {
        TEST: testOk ? 'conectado' : 'caído',
        PROD: prodOk ? 'conectado' : 'caído',
      },
      timestamp: new Date().toISOString(),
    }), {
      status: allOk ? 200 : 503,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};