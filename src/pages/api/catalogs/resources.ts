import type { APIRoute } from 'astro';
import { getConnectionPool } from '../../../compared/infrastructure/database/sqlServerConnection';
import { resolveConnectionEnv } from '../../../compared/domain/config/environments';

export const GET: APIRoute = async ({ url }) => {
  const productId = Number(url.searchParams.get('productId'));
  const sourceId = url.searchParams.get('sourceId') ?? 'MDEPYD01NEW';

  if (!productId) {
    return new Response(
      JSON.stringify({ error: 'productId requerido' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const pool = await getConnectionPool(resolveConnectionEnv(sourceId));

    const result = await pool.request()
      .input('productId', productId)
      .query(`
        SELECT ResourcesId, ProductId, [Space], TypeResource
        FROM Resources
        WHERE ProductId = @productId
        ORDER BY [Space]
      `);

    // Normalizamos a camelCase para que el frontend lo consuma directo
    const resources = result.recordset.map((r: any) => ({
      resourcesId: Number(r.ResourcesId),
      productId: Number(r.ProductId),
      space: r.Space ?? '',
      typeResource: r.TypeResource ?? null,
    }));

    return new Response(JSON.stringify(resources), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[catalogs/resources] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};