import type { APIRoute } from 'astro';
import { GenerateSqlUseCase } from '../../compared/use-cases/GenerateSqlUseCase'; 
import { TABLE_DEFINITIONS } from '../../compared/domain/config/tableDefinitions'; 
import type { PendingChange, CartContext } from '../../compared/domain/entities/PendingChange'; 

interface RequestBody {
  changes: Array<{
    tableName: string;
    filterValue: string | number;
    item: any;
    context?: CartContext;
  }>;
  direction?: 'TEST_TO_PROD' | 'PROD_TO_TEST';
  includeTransaction?: boolean;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body: RequestBody = await request.json();

    if (!body.changes || !Array.isArray(body.changes) || body.changes.length === 0) {
      return new Response(JSON.stringify({ error: 'No hay cambios para generar' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const pendingChanges: PendingChange[] = body.changes
      .map((c, i) => {
        const definition = TABLE_DEFINITIONS[c.tableName];
        if (!definition) return null;
        return {
          id: `${c.tableName}-${c.item.displayKey}-${i}`,
          definition,
          filterValue: c.filterValue,
          item: c.item,
          context: c.context ?? { customerNit: null },
        };
      })
      .filter((c): c is PendingChange => c !== null);

    if (pendingChanges.length === 0) {
      return new Response(JSON.stringify({ error: 'Ninguna tabla válida en los cambios' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const useCase = new GenerateSqlUseCase();
    const result = useCase.execute(pendingChanges, {
      direction: body.direction ?? 'TEST_TO_PROD',
      includeTransaction: body.includeTransaction ?? true,
    });

    return new Response(JSON.stringify(result), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};