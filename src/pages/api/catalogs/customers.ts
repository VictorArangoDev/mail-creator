import type { APIRoute } from 'astro';
import { sqlServerCatalogoRepository } from '../../../compared/infrastructure/repositories/SqlServerCatalogRepository'; 

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get('q') || '';
  try {
    const repo = new sqlServerCatalogoRepository();
    const customers = await repo.searchCustomer(q, 'TEST');
    return new Response(JSON.stringify(customers), {
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