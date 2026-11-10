import type { APIRoute } from 'astro';
import { getConnectionPool } from '../../../compared/infrastructure/database/sqlServerConnection';

export const GET: APIRoute = async ({ url }) => {
  const productId = Number(url.searchParams.get('productId'));
  if (!productId) {
    return new Response(JSON.stringify({ error: 'productId requerido' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const pool = await getConnectionPool('PROD');
    const result = await pool.request()
      .input('productId', productId)
      .query(`
        SELECT SubProductId, ProductId, Name, Description
        FROM SubProduct
        WHERE ProductId = @productId
        ORDER BY Name
      `);

    return new Response(JSON.stringify(result.recordset), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};