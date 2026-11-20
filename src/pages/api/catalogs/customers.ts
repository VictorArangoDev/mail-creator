import type { APIRoute } from 'astro';
import { SqlServerCatalogoRepository } from '../../../compared/infrastructure/repositories/SqlServerCatalogRepository'; 
import { resolveConnectionEnv } from '../../../compared/domain/config/environments';

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get('q') ?? '';
  const sourceId = url.searchParams.get('sourceId') ?? 'MDEPYD01NEW';

  try {
    const repo = new SqlServerCatalogoRepository();
    const customers = await repo.searchCustomer(q, resolveConnectionEnv(sourceId));
    return new Response(JSON.stringify(customers), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[catalogs/customers] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};