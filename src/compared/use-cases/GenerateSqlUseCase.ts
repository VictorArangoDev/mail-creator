import type { GenerateScript, PendingChange } from "../domain/entities/PendingChange";
import type { TableDefinition } from "../domain/config/tableDefinitions"; 
import { INSTANCES } from "../domain/config/instances"; 

interface GenerateOptions {
  direction?: 'TEST_TO_PROD' | 'PROD_TO_TEST';
  includeTransaction?: boolean;
  /** Si true (por defecto) cada UPDATE valida que afecte exactamente 1 fila; si no, aborta con THROW. */
  validateRowCount?: boolean;
}

interface BuildOpts {
  direction: string;
  validateRowCount: boolean;
}

export class GenerateSqlUseCase {

  execute(changes: PendingChange[], options: GenerateOptions = {}): GenerateScript {
    const { direction = 'TEST_TO_PROD', includeTransaction = true, validateRowCount = true } = options;
    const opts: BuildOpts = { direction, validateRowCount };

    const byInstance = new Map<string, Map<string, PendingChange[]>>();
    for (const change of changes) {
      const targets = this.resolveInstances(change.definition);
      for (const instId of targets) {
        if (!byInstance.has(instId)) byInstance.set(instId, new Map());
        const tableMap = byInstance.get(instId)!;
        if (!tableMap.has(change.definition.tableName)) {
          tableMap.set(change.definition.tableName, []);
        }
        tableMap.get(change.definition.tableName)!.push(change);
      }
    }

    const scripts: string[] = [];
    let totalUpdates = 0, totalInserts = 0, totalWarnings = 0;

    for (const [instId, tableMap] of byInstance) {
      const instance = INSTANCES[instId];
      const result = this.buildInstanceScript(instance, tableMap, opts, includeTransaction);
      scripts.push(result.script);
      totalUpdates += result.updates;
      totalInserts += result.inserts;
      totalWarnings += result.warnings;
    }

    return {
      sql: scripts.join('\n\n\n'),
      stats: {
        totalChanges: totalUpdates + totalInserts,
        updates: totalUpdates,
        inserts: totalInserts,
        warnings: totalWarnings,
        tables: byInstance.size,
        instances: byInstance.size,
      },
    };
  }

  // ======================== BUILDERS ========================

  private buildInstanceScript(
    instance: any,
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

  private buildHeader(instance: any, totalTables: number, direction: string): string {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const dst = direction === 'TEST_TO_PROD' ? instance.targetName : instance.sourceName;
    const src = direction === 'TEST_TO_PROD' ? instance.sourceName : instance.targetName;
    return [
      '/*=========================================================',
      ` * Migración a ${direction === 'TEST_TO_PROD' ? 'Producción' : 'TEST'}`,
      ` * Aplicar en la instancia: ${dst}`,
      ` * Instancia vinculada: ${src}`,
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
    instance: any
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
    instance: any,
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

  /**
   * INSERT por fila con NOT EXISTS sobre la llave de emparejamiento.
   * - SIMPLE:        (filterColumn, keyColumn)
   * - COMPOSITE_KEY: compositeKeys
   * Si la tabla inserta su columna identity explícitamente, antes valida que el Id
   * no exista en destino con OTRA llave natural (colisión de Id entre ambientes).
   */
  private buildInsertBlock(
    def: TableDefinition,
    inserts: PendingChange[],
    instance: any,
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
      lines.push(`        INNER JOIN dbo.${def.tableName} D ON D.${this.q(identityCol!)} = S.${this.q(identityCol!)}`);
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
    instance: any,
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
        .map(col => `O.${this.q(col)} = ${this.sqlLiteral(this.keyValue(def, change, row, col))}`)
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

  private resolveInstances(def: TableDefinition): string[] {
    if (def.targetInstance === 'BOTH') return ['PROJECT5X', 'CADCORE'];
    if (def.targetInstance === 'CADCORE') return ['CADCORE'];
    return ['PROJECT5X'];
  }

  /** Columnas que identifican una fila de forma única entre ambientes. */
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

  /** Valor de una columna llave para una fila; falla si no se puede determinar (evita "= NULL"). */
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
