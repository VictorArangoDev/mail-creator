import type { APIRoute } from 'astro';
import { SqlServerTableRepository } from '../../compared/infrastructure/repositories/SqlServerTableRepository'; 
import { CompareConfigsUseCase } from '../../compared/use-cases/CompareConfigsUseCase';
import { TABLE_DEFINITIONS } from '../../compared/domain/config/tableDefinitions'; 

export const GET: APIRoute = async ({ url }) => {
  const tableName = url.searchParams.get('table');
  const filterRaw = url.searchParams.get('filter');

  if (!tableName || !TABLE_DEFINITIONS[tableName]) {
    return new Response(JSON.stringify({
      error: `Tabla no permitida. Válidas: ${Object.keys(TABLE_DEFINITIONS).join(', ')}`,
    }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (!filterRaw) {
    return new Response(JSON.stringify({ error: 'El parámetro "filter" es requerido' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const definition = TABLE_DEFINITIONS[tableName];
  const filter = /^\d+$/.test(filterRaw) ? Number(filterRaw) : filterRaw;

  try {
    const repo = new SqlServerTableRepository();
    const [testData, prodData] = await Promise.all([
      repo.getRecordsByFilter(definition, filter, 'TEST'),
      repo.getRecordsByFilter(definition, filter, 'PROD'),
    ]);

    const useCase = new CompareConfigsUseCase();
    const result = useCase.execute(definition, filter, testData, prodData);

    return new Response(JSON.stringify(result), {
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