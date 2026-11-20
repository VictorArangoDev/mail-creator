import type { APIRoute } from 'astro';
import { TABLE_DEFINITIONS } from '../../compared/domain/config/tableDefinitions'; 

export const GET: APIRoute = async () => {
  const tables = Object.values(TABLE_DEFINITIONS).map(t => ({
    tableName: t.tableName,
    displayName: t.displayName,
    filterColumn: t.filterColumn,
    selectorType: t.selectorType,
    manualPlaceholder: t.manualPlaceHolder,
    updateStrategy: t.updateStrategy,
  }));

  return new Response(JSON.stringify(tables), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};