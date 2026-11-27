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
        SELECT SubProductId, ProductId, Name, Description
        FROM SubProduct
        WHERE ProductId = @productId
        ORDER BY Name
      `);

    // Normalizamos el casing por si SQL Server devuelve minúsculas
    const subProducts = result.recordset.map((r: any) => ({
      subProductId: Number(r.SubProductId),
      productId: Number(r.ProductId),
      name: r.Name ?? '',
      description: r.Description ?? null,
    }));

    return new Response(JSON.stringify(subProducts), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[catalogs/subproducts] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};



// import type { APIRoute } from 'astro';
// import { getConnectionPool } from '../../../compared/infrastructure/database/sqlServerConnection';

// export const GET: APIRoute = async ({ url }) => {
//   const productId = Number(url.searchParams.get('productId'));
//   if (!productId) {
//     return new Response(JSON.stringify({ error: 'productId requerido' }), {
//       status: 400, headers: { 'Content-Type': 'application/json' },
//     });
//   }

//   try {
//     const pool = await getConnectionPool('TEST');
//     const result = await pool.request()
//       .input('productId', productId)
//       .query(`
//         SELECT SubProductId, ProductId, Name, Description
//         FROM SubProduct
//         WHERE ProductId = @productId
//         ORDER BY Name
//       `);

//     return new Response(JSON.stringify(result.recordset), {
//       status: 200, headers: { 'Content-Type': 'application/json' },
//     });
//   } catch (error: any) {
//     return new Response(JSON.stringify({ error: error.message }), {
//       status: 500, headers: { 'Content-Type': 'application/json' },
//     });
//   }
// };