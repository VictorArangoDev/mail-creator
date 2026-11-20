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
  validateRowCount?: boolean;
  /** Configuración de entornos elegida por el usuario. */
  environment?: {
    sourceId: string;
    targetId: string;
  };
}

/** Default cuando el usuario no ha configurado entornos. */
const DEFAULT_ENV = {
  sourceId: 'MDEPYD01NEW',
  targetId: 'PROJECT5X',
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body: RequestBody = await request.json();

    // ---- Validaciones de entrada ----
    if (!body.changes || !Array.isArray(body.changes) || body.changes.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No hay cambios para generar' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ---- Hidratar carrito con definiciones reales (whitelist) ----
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
      return new Response(
        JSON.stringify({ error: 'Ninguna tabla válida en los cambios' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ---- Ejecutar caso de uso con la configuración de entornos ----
    const useCase = new GenerateSqlUseCase();
    const result = useCase.execute(pendingChanges, {
      direction: body.direction ?? 'TEST_TO_PROD',
      includeTransaction: body.includeTransaction ?? true,
      validateRowCount: body.validateRowCount ?? true,
      environment: body.environment ?? DEFAULT_ENV,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    // Loguea el error para diagnóstico (útil en prod)
    console.error('[generate-sql] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message ?? 'Error desconocido generando SQL' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};