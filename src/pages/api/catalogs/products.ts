import type { APIRoute } from 'astro';
import { SqlServerCatalogoRepository } from '../../../compared/infrastructure/repositories/SqlServerCatalogRepository'; 
import { resolveConnectionEnv } from '../../../compared/domain/config/environments';

export const GET: APIRoute = async ({ url }) => {
  const nit = url.searchParams.get('nit');
  const sourceId = url.searchParams.get('sourceId') ?? 'MDEPYD01NEW';

  if (!nit) {
    return new Response(JSON.stringify({ error: 'nit requerido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const repo = new SqlServerCatalogoRepository();
    const products = await repo.getProductsByNit(nit, resolveConnectionEnv(sourceId));
    return new Response(JSON.stringify(products), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[catalogs/products] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};