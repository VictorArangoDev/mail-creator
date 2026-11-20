import type { GenerateScript, PendingChange } from "../domain/entities/PendingChange";
import type { TableDefinition } from "../domain/config/tableDefinitions";
import {
  getEnvironment,
  getLinkedServerAlias,
} from "../domain/config/environments";

interface GenerateOptions {
  direction?: 'TEST_TO_PROD' | 'PROD_TO_TEST';
  includeTransaction?: boolean;
  /** Si true (por defecto) cada UPDATE valida que afecte exactamente 1 fila; si no, aborta con THROW. */
  validateRowCount?: boolean;
  /** Configuración de entornos elegida por el usuario (default: MDEPYD01NEW → PROJECT5X). */
  environment?: {
    sourceId: string;
    targetId: string;
  };
}

interface BuildOpts {
  direction: string;
  validateRowCount: boolean;
}

/** Estructura interna que los builders usan. Compatible con lo que ya tenías. */
interface ResolvedInstance {
  targetName: string;
  sourceName: string;
  sourcePrefix: string;
  targetDb: string;
  description: string;
  hasLinkedServer: boolean;
}

const DEFAULT_ENV = {
  sourceId: 'MDEPYD01NEW',
  targetId: 'PROJECT5X',
};

export class GenerateSqlUseCase {

  execute(changes: PendingChange[], options: GenerateOptions = {}): GenerateScript {
    const {
      direction = 'TEST_TO_PROD',
      includeTransaction = true,
      validateRowCount = true,
      environment = DEFAULT_ENV,
    } = options;

    const opts: BuildOpts = { direction, validateRowCount };

    // 1. Resolver entorno origen / destino
    const sourceEnv = getEnvironment(environment.sourceId);
    const targetEnv = getEnvironment(environment.targetId);

    if (!sourceEnv || !targetEnv) {
      throw new Error(
        `Entorno inválido: source=${environment.sourceId} target=${environment.targetId}`
      );
    }

    // 2. Resolver alias del linked server según el destino
    const linkedServerAlias = getLinkedServerAlias(targetEnv.id);
    const sourcePrefix = linkedServerAlias
      ? `${linkedServerAlias}.${sourceEnv.database}.dbo`
      : '';

    // 2.1 Formatear etiqueta del servidor (con IP si existe)
    const formatServerLabel = (env: { server: string; ip?: string; database: string }): string => {
      if (env.ip && env.ip !== env.server) {
        return `${env.server} (${env.ip}) [${env.database}]`;
      }
      return `${env.server} [${env.database}]`;
    };

    // 3. Construir la instancia resuelta (AHORA usando formatServerLabel)
    const instance: ResolvedInstance = {
      targetName: formatServerLabel(targetEnv),      // ← CAMBIO
      sourceName: formatServerLabel(sourceEnv),      // ← CAMBIO
      sourcePrefix,
      targetDb: targetEnv.database,
      description: targetEnv.description,
      hasLinkedServer: !!linkedServerAlias,
    };
    console.log('🔍 [GenerateSql] instance:', {
      sourceEnv,
      targetEnv,
      linkedServerAlias,
      sourcePrefix,
      instance,
    });


    // 4. Validar que si hay COMPOSITE_KEY, exista linked server
    const hasCompositeKeyChanges = changes.some(
      c => c.definition.updateStrategy === 'COMPOSITE_KEY'
    );
    if (hasCompositeKeyChanges && !instance.hasLinkedServer) {
      throw new Error(
        `No hay linked server configurado para el destino "${targetEnv.label}". ` +
        `Las tablas con COMPOSITE_KEY (Template, FileSchemas, etc.) requieren un linked server configurado.`
      );
    }

    // 5. Agrupar por tabla (ya no por instancia, porque ahora hay un único destino)
    const tableMap = new Map<string, PendingChange[]>();
    for (const change of changes) {
      if (!tableMap.has(change.definition.tableName)) {
        tableMap.set(change.definition.tableName, []);
      }
      tableMap.get(change.definition.tableName)!.push(change);
    }

    // 6. Generar el script único
    const result = this.buildInstanceScript(instance, tableMap, opts, includeTransaction);

    return {
      sql: result.script,
      stats: {
        totalChanges: result.updates + result.inserts,
        updates: result.updates,
        inserts: result.inserts,
        warnings: result.warnings,
        tables: tableMap.size,
        instances: 1,   // ← ahora siempre 1 (un solo destino)
      },
    };
  }

  // ======================== BUILDERS ========================

  private buildInstanceScript(
    instance: ResolvedInstance,
    tableMap: Map<string, PendingChange[]>,
    opts: BuildOpts,
    includeTransaction: boolean
  ): { script: string; updates: number; inserts: number; warnings: number } {
    const parts: string[] = [];
    let totalUpdates = 0, totalInserts = 0, totalWarnings = 0;

    parts.push(this.buildHeader(instance, tableMap.size, opts.direction));
    parts.push(`USE ${instance.targetDb};`);
    parts.push(`SET XACT_ABORT ON;`);

    if (includeTransaction) {
      parts.push(`BEGIN TRY\n    BEGIN TRANSACTION;`);
    }

    const context = this.collectContext(tableMap);
    if (context) {
      parts.push(this.buildContextBlock(context, instance));
    }

    let tableIndex = 1;
    for (const [, changes] of tableMap) {
      const def = changes[0].definition;
      const result = this.buildTableBlock(tableIndex, def, changes, instance, opts);
      if (result.block) {
        parts.push(result.block);
        totalUpdates += result.updates;
        totalInserts += result.inserts;
        totalWarnings += result.warnings;
        tableIndex++;
      }
    }

    if (includeTransaction) {
      parts.push(
        `    COMMIT TRANSACTION;\n\n` +
        `END TRY\n` +
        `BEGIN CATCH\n` +
        `    IF @@TRANCOUNT > 0\n` +
        `        ROLLBACK TRANSACTION;\n` +
        `    THROW;\n` +
        `END CATCH;`
      );
    }

    return {
      script: parts.join('\n\n'),
      updates: totalUpdates,
      inserts: totalInserts,
      warnings: totalWarnings,
    };
  }

  private buildHeader(instance: ResolvedInstance, totalTables: number, direction: string): string {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const dst = direction === 'TEST_TO_PROD' ? instance.targetName : instance.sourceName;
    const src = direction === 'TEST_TO_PROD' ? instance.sourceName : instance.targetName;
    return [
      '/*=========================================================',
      ` * Migración a ${direction === 'TEST_TO_PROD' ? 'Producción' : 'TEST'}`,
      ` * Aplicar en la instancia: ${dst}`,
      ` * Instancia vinculada: ${src}`,
      instance.hasLinkedServer
        ? ` * Linked Server: ${instance.sourcePrefix}`
        : ` * Modo: DIRECT (sin linked server)`,
      ` * Generado: ${now}`,
      ` * Tablas: ${totalTables}`,
      '=========================================================*/',
    ].join('\n');
  }

  private collectContext(tableMap: Map<string, PendingChange[]>): {
    filters: Map<string, any>;
    customerNit: string | null;
  } | null {
    const filters = new Map<string, any>();
    let customerNit: string | null = null;

    for (const changes of tableMap.values()) {
      for (const change of changes) {
        const filterCol = change.definition.filterColumn;
        if (!filters.has(filterCol)) filters.set(filterCol, change.filterValue);
        if (change.context.customerNit) customerNit = change.context.customerNit;
      }
    }

    if (filters.size === 0 && !customerNit) return null;
    return { filters, customerNit };
  }

  private buildContextBlock(
    ctx: { filters: Map<string, any>; customerNit: string | null },
    _instance: ResolvedInstance
  ): string {
    const lines: string[] = [];

    lines.push('    /*=========================================================');
    lines.push('     * Variables del contexto a migrar');
    lines.push('    =========================================================*/');

    if (ctx.customerNit) {
      lines.push(`    DECLARE @CustomerNit BIGINT = ${ctx.customerNit};`);
    }
    for (const [name, value] of ctx.filters.entries()) {
      const type = typeof value === 'number' ? 'INT' : 'NVARCHAR(100)';
      lines.push(`    DECLARE @${name} ${type} = ${this.sqlLiteral(value)};`);
    }

    if (ctx.customerNit) {
      lines.push('');
      lines.push('    /*=========================================================');
      lines.push('     * Valida la existencia del Customer');
      lines.push('    =========================================================*/');
      lines.push('    IF NOT EXISTS');
      lines.push('    (');
      lines.push('        SELECT 1');
      lines.push('        FROM dbo.Customers');
      lines.push('        WHERE Nit = @CustomerNit');
      lines.push('    )');
      lines.push('    BEGIN');
      lines.push("        RAISERROR('El cliente no existe.', 16, 1);");
      lines.push('    END');
    }

    return lines.join('\n');
  }

  private buildTableBlock(
    index: number,
    def: TableDefinition,
    changes: PendingChange[],
    instance: ResolvedInstance,
    opts: BuildOpts
  ): { block: string; updates: number; inserts: number; warnings: number } {
    const { direction } = opts;
    const parts: string[] = [];
    let updateCount = 0, insertCount = 0, warningCount = 0;

    parts.push(
      '    /*=========================================================\n' +
      `     * TABLA ${index}: ${def.tableName}\n` +
      '    =========================================================*/'
    );

    const warnings = changes.filter(c =>
      direction === 'TEST_TO_PROD'
        ? c.item.status === 'NUEVO_EN_PROD'
        : c.item.status === 'NUEVO_EN_TEST'
    );
    const inserts = changes.filter(c =>
      direction === 'TEST_TO_PROD'
        ? c.item.status === 'NUEVO_EN_TEST'
        : c.item.status === 'NUEVO_EN_PROD'
    );
    const updates = changes.filter(c => c.item.status === 'DIFERENTE');

    for (const w of warnings) {
      parts.push(
        `    -- [WARNING] ${def.keyColumn}=${w.item.displayKey}: existe solo en el origen. Revisar manualmente.`
      );
      warningCount++;
    }

    if (inserts.length > 0) {
      parts.push(this.buildInsertBlock(def, inserts, instance, direction));
      insertCount += inserts.length;
    }

    if (updates.length > 0) {
      parts.push(this.buildUpdatesBlock(def, updates, instance, opts));
      updateCount += updates.length;
    }

    return { block: parts.join('\n\n'), updates: updateCount, inserts: insertCount, warnings: warningCount };
  }

  // ==================== INSERT ====================

  private buildInsertBlock(
    def: TableDefinition,
    inserts: PendingChange[],
    instance: ResolvedInstance,
    direction: string
  ): string {
    if (inserts.length === 0) return '';

    const columns = def.insertColumns ?? [def.filterColumn, def.keyColumn, ...def.valueColumns];
    const keys = this.matchKeys(def);
    const src = `${instance.sourcePrefix}.${def.tableName}`;

    const rowFilters = inserts
      .map(change => {
        const row = this.rowOf(change, direction);
        if (!row) return '';
        const cond = keys
          .map(k =>
            this.keyValue(def, change, row, k) === null
              ? `S.${this.q(k)} IS NULL`
              : `S.${this.q(k)} = ${this.sqlLiteral(this.keyValue(def, change, row, k))}`
          )
          .join(' AND ');
        return `(${cond})`;
      })
      .filter(Boolean);

    if (rowFilters.length === 0) return '';

    const whereRows = rowFilters.join('\n           OR ');
    const naturalMatch = keys.map(k => `D.${this.q(k)} = S.${this.q(k)}`).join(' AND ');

    const identityCol = def.identityColumn;
    const useIdentityInsert =
      def.hasIdentity === true && !!identityCol && columns.includes(identityCol);

    const colList = columns.map(c => this.q(c)).join(',\n            ');
    const selList = columns.map(c => `S.${this.q(c)}`).join(',\n            ');

    const lines: string[] = [];
    lines.push(`    /*=========================================================`);
    lines.push(`     * Insertar en ${def.tableName} los registros que no existan`);
    lines.push(`    =========================================================*/`);

    if (useIdentityInsert) {
      lines.push(`    -- Guardia: el Id (${identityCol}) no debe existir en destino con otra llave natural`);
      lines.push(`    IF EXISTS`);
      lines.push(`    (`);
      lines.push(`        SELECT 1`);
      lines.push(`        FROM ${src} S`);
      lines.push(`        INNER JOIN ${instance.sourcePrefix}.${def.tableName} D ON D.${this.q(identityCol!)} = S.${this.q(identityCol!)}`);
      lines.push(`        WHERE (${whereRows})`);
      lines.push(`          AND NOT (${naturalMatch})`);
      lines.push(`    )`);
      lines.push(`    BEGIN`);
      lines.push(`        THROW 50003, 'Colisión de Id identity en ${def.tableName}: el Id ya existe en destino con otra llave natural.', 1;`);
      lines.push(`    END`);
      lines.push('');
    }

    lines.push(`    BEGIN TRY`);
    if (useIdentityInsert) {
      lines.push(`        SET IDENTITY_INSERT dbo.${def.tableName} ON;`);
      lines.push('');
    }
    lines.push(`        INSERT INTO dbo.${def.tableName}`);
    lines.push(`        (`);
    lines.push(`            ${colList}`);
    lines.push(`        )`);
    lines.push(`        SELECT`);
    lines.push(`            ${selList}`);
    lines.push(`        FROM ${src} S`);
    lines.push(`        WHERE (${whereRows})`);
    lines.push(`          AND NOT EXISTS`);
    lines.push(`          (`);
    lines.push(`              SELECT 1`);
    lines.push(`              FROM dbo.${def.tableName} D`);
    lines.push(`              WHERE ${naturalMatch}`);
    lines.push(`          );`);
    if (useIdentityInsert) {
      lines.push('');
      lines.push(`        SET IDENTITY_INSERT dbo.${def.tableName} OFF;`);
    }
    lines.push(`    END TRY`);
    lines.push(`    BEGIN CATCH`);
    if (useIdentityInsert) {
      lines.push(`        SET IDENTITY_INSERT dbo.${def.tableName} OFF;`);
    }
    lines.push(`        THROW;`);
    lines.push(`    END CATCH;`);

    return lines.join('\n');
  }

  // ==================== UPDATE ====================

  private buildUpdatesBlock(
    def: TableDefinition,
    changes: PendingChange[],
    instance: ResolvedInstance,
    opts: BuildOpts
  ): string {
    const { direction, validateRowCount } = opts;

    const rowCountGuard = (label: string): string =>
      validateRowCount
        ? `    IF @@ROWCOUNT <> 1\n` +
        `        THROW 50002, 'UPDATE afectó un número inesperado de filas en ${def.tableName} (${label.replace(/'/g, "''")}).', 1;`
        : '';

    // ---- SIMPLE ----
    if (def.updateStrategy === 'SIMPLE') {
      const updates = changes.map(change => {
        const row = this.rowOf(change, direction);
        if (!row) return '';

        const setClauses = def.valueColumns
          .map(col => `        ${this.q(col)} = ${this.sqlLiteral(row[col])}`)
          .join(',\n');

        const whereColumns = Array.from(new Set([def.filterColumn, def.keyColumn]));
        const whereConditions = whereColumns
          .map(col => {
            if (col === def.filterColumn) {
              return `        ${this.q(col)} = @${def.filterColumn}`;
            }
            return `        ${this.q(col)} = ${this.sqlLiteral(change.item.displayKey.split('|')[0])}`;
          })
          .join('\n        AND ');

        return [
          `    /* UPDATE ${def.keyColumn}=${change.item.displayKey} */`,
          `    UPDATE dbo.${def.tableName}`,
          `    SET`,
          setClauses,
          `    WHERE ${whereConditions};`,
          rowCountGuard(`${def.keyColumn}=${change.item.displayKey}`),
        ].filter(Boolean).join('\n');
      });
      return updates.filter(Boolean).join('\n\n');
    }

    // ---- COMPOSITE_KEY ----
    const updates = changes.map(change => {
      const row = this.rowOf(change, direction);
      if (!row) return '';

      const compositeKeys = def.compositeKeys ?? [def.keyColumn];

      const setClauses = def.valueColumns
        .map(col => `        D.${this.q(col)} = O.${this.q(col)}`)
        .join(',\n');

      const joinConditions = compositeKeys
        .map(col => `D.${this.q(col)} = O.${this.q(col)}`)
        .join(' AND ');

      const whereConditions = compositeKeys
        .map(col => {
          const v = this.keyValue(def, change, row, col);
          return v === null
            ? `O.${this.q(col)} IS NULL`
            : `O.${this.q(col)} = ${this.sqlLiteral(v)}`;
        })
        .join(' AND ');

      const label = compositeKeys.map(c => `${c}=${row[c]}`).join(', ');

      return [
        `    /* UPDATE ${label} */`,
        `    UPDATE D`,
        `    SET`,
        setClauses,
        `    FROM   dbo.${def.tableName} D`,
        `    INNER JOIN ${instance.sourcePrefix}.${def.tableName} O`,
        `           ON ${joinConditions}`,
        `    WHERE  ${whereConditions};`,
        rowCountGuard(label),
      ].filter(Boolean).join('\n');
    });
    return updates.filter(Boolean).join('\n\n');
  }

  // ==================== HELPERS ====================

  private matchKeys(def: TableDefinition): string[] {
    if (def.updateStrategy === 'COMPOSITE_KEY') {
      return def.compositeKeys && def.compositeKeys.length > 0 ? def.compositeKeys : [def.keyColumn];
    }
    return Array.from(new Set([def.filterColumn, def.keyColumn]));
  }

  private rowOf(change: PendingChange, direction: string): Record<string, any> | null {
    const row = direction === 'TEST_TO_PROD' ? change.item.testRaw : change.item.prodRaw;
    return (row as Record<string, any>) ?? null;
  }

  private keyValue(
    def: TableDefinition,
    change: PendingChange,
    row: Record<string, any> | null,
    col: string
  ): unknown {
    let value: unknown;

    if (def.updateStrategy === 'SIMPLE') {
      if (col === def.filterColumn) value = change.filterValue;
      else if (col === def.keyColumn) value = change.item.displayKey.split('|')[0];
    }
    if (value === undefined && row && row[col] !== undefined) value = row[col];
    if (value === undefined && col === def.filterColumn) value = change.filterValue;

    if (value === undefined) {
      throw new Error(`No se pudo determinar el valor de la llave "${col}" para ${def.tableName} (${change.item.displayKey}).`);
    }
    return value;
  }

  private q(col: string): string {
    return `[${col.replace(/]/g, ']]')}]`;
  }

  private sqlLiteral(value: unknown): string {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return value ? '1' : '0';
    const escaped = String(value).replace(/'/g, "''");
    return `'${escaped}'`;
  }
}