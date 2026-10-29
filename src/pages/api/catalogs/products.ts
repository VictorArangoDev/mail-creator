import type { APIRoute } from 'astro';
import { sqlServerCatalogoRepository } from '../../../compared/infrastructure/repositories/SqlServerCatalogRepository';

export const GET: APIRoute = async ({ url }) => {
  const nit = url.searchParams.get('nit');

  if (!nit) {
    return new Response(JSON.stringify({ error: 'nit es requerido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    const repo = new sqlServerCatalogoRepository();
    const products = await repo.getProductsByNit(nit, 'TEST');
    return new Response(JSON.stringify(products), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};