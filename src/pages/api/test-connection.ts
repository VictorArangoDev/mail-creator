
import type { APIRoute } from 'astro';
import { SqlServerTableRepository } from '../../compared/infrastructure/repositories/SqlServerTableRepository'; 

export const GET: APIRoute = async ({ url }) => {
  const repo = new SqlServerTableRepository();
  const tableName = url.searchParams.get('table') || 'SettingsByProduct';
  const productId = Number(url.searchParams.get('ProductId') || 1965);
  
  try {
    // Ejecutamos ambas consultas en paralelo para mayor velocidad
    const [testData, prodData] = await Promise.all([
      repo.getTableSettingsByProductId(tableName, productId, 'TEST'),
      repo.getTableSettingsByProductId(tableName, productId, 'PROD'),
    ]);

    return new Response(JSON.stringify({
      status: 'ok',
      productId,
      totalRecordsTest: testData.length,
      totalRecordsProd: prodData.length,
      sampleTest: testData.slice(0, 3),
      sampleProd: prodData.slice(0, 3),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};