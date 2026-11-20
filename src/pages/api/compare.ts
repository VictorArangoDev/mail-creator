import type { APIRoute } from 'astro';
import { SqlServerTableRepository } from '../../compared/infrastructure/repositories/SqlServerTableRepository'; 
import { CompareConfigsUseCase } from '../../compared/use-cases/CompareConfigsUseCase'; 
import { TABLE_DEFINITIONS } from '../../compared/domain/config/tableDefinitions'; 
import { resolveConnectionEnv } from '../../compared/domain/config/environments'; 

export const GET: APIRoute = async ({ url }) => {
  const tableName = url.searchParams.get('table');
  const filterRaw = url.searchParams.get('filter');

  // ← Los nuevos parámetros para multi-entorno
  const sourceId = url.searchParams.get('sourceId') ?? 'MDEPYD01NEW';
  const targetId = url.searchParams.get('targetId') ?? 'PROJECT5X';

  if (!tableName || !TABLE_DEFINITIONS[tableName]) {
    return new Response(
      JSON.stringify({ error: `Tabla no permitida: ${tableName}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  if (!filterRaw) {
    return new Response(
      JSON.stringify({ error: 'Falta el parámetro "filter"' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const definition = TABLE_DEFINITIONS[tableName];
  const filter = /^\d+$/.test(filterRaw) ? Number(filterRaw) : filterRaw;

  // ← Resolver conexiones reales a partir de los IDs
  const sourceConnEnv = resolveConnectionEnv(sourceId);
  const targetConnEnv = resolveConnectionEnv(targetId);

  try {
    const repo = new SqlServerTableRepository();

    // ← Consultar la conexión de source (ej: MDEPYD) y la de target (ej: PROJECT5X)
    const [sourceData, targetData] = await Promise.all([
      repo.getRecordsByFilter(definition, filter, sourceConnEnv),
      repo.getRecordsByFilter(definition, filter, targetConnEnv),
    ]);

    const useCase = new CompareConfigsUseCase();
    const result = useCase.execute(definition, filter, sourceData, targetData);

    return new Response(JSON.stringify({
      ...result,
      sourceId,
      targetId,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[compare] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};