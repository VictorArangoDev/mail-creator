import type { GenerateScript, PendingChange } from "../domain/entities/PendingChange";
import type { TableDefinition } from "../domain/config/tableDefinitions"; 
import { INSTANCES } from "../domain/config/instances"; 

interface GenerateOptions {
  direction?: 'TEST_TO_PROD' | 'PROD_TO_TEST';
  includeTransaction?: boolean;
}

export class GenerateSqlUseCase {

  execute(changes: PendingChange[], options: GenerateOptions = {}): GenerateScript {
    const { direction = 'TEST_TO_PROD', includeTransaction = true } = options;

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
      const result = this.buildInstanceScript(instance, tableMap, direction, includeTransaction);
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
    direction: string,
    includeTransaction: boolean
  ): { script: string; updates: number; inserts: number; warnings: number } {
    const parts: string[] = [];
    let totalUpdates = 0, totalInserts = 0, totalWarnings = 0;

    parts.push(this.buildHeader(instance, tableMap.size, direction));
    parts.push(`USE ${instance.targetDb};\nGO`);
    parts.push(`SET XACT_ABORT ON;\nGO`);

    if (includeTransaction) {
      parts.push(`BEGIN TRY\n    BEGIN TRANSACTION;`);
    }

    const context = this.collectContext(tableMap);
    if (context) {
      parts.push(this.buildContextBlock(context));
    }

    let tableIndex = 1;
    for (const [tableName, changes] of tableMap) {
      const def = changes[0].definition;
      const result = this.buildTableBlock(tableIndex, def, changes, instance, direction);
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

  private buildContextBlock(ctx: { filters: Map<string, any>; customerNit: string | null }): string {
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
    direction: string
  ): { block: string; updates: number; inserts: number; warnings: number } {
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
      parts.push(this.buildUpdatesBlock(def, updates, instance, direction));
      updateCount += updates.length;
    }

    return { block: parts.join('\n\n'), updates: updateCount, inserts: insertCount, warnings: warningCount };
  }

  // ==================== INSERT ====================

  private buildInsertBlock(
    def: TableDefinition,
    inserts: PendingChange[],
    instance: any,
    direction: string
  ): string {
    if (inserts.length === 0) return '';

    const columns = def.insertColumns ?? [def.filterColumn, def.keyColumn, ...def.valueColumns];
    const hasIdentity = def.hasIdentity === true && !!def.identityColumn;
    const identityOn = hasIdentity ? `        SET IDENTITY_INSERT dbo.${def.tableName} ON;\n\n` : '';
    const identityOff = hasIdentity ? `\n\n        SET IDENTITY_INSERT dbo.${def.tableName} OFF;` : '';
    const catchIdentity = hasIdentity ? `        SET IDENTITY_INSERT dbo.${def.tableName} OFF;\n` : '';

    let ifNotExistsWhere: string;
    let selectWhere: string;

    if (def.updateStrategy === 'SIMPLE') {
      const filterValue = inserts[0].filterValue;
      const keyValues = inserts
        .map(c => this.sqlLiteral(c.item.displayKey.split('|')[0]))
        .join(', ');

      const cond = `${def.filterColumn} = ${this.sqlLiteral(filterValue)}`;

      if (def.filterColumn === def.keyColumn) {
        ifNotExistsWhere = `WHERE ${cond}`;
        selectWhere = cond;
      } else {
        ifNotExistsWhere = `WHERE ${cond}\n            AND ${def.keyColumn} IN (${keyValues})`;
        selectWhere = `${cond} AND ${def.keyColumn} IN (${keyValues})`;
      }
    } else {
      // COMPOSITE_KEY: WHERE con OR de (filterColumn = X AND keyColumn = Y)
      const conditions = inserts
        .map(change => {
          const r = direction === 'TEST_TO_PROD' ? change.item.testRaw : change.item.prodRaw;
          if (!r) return '';

          const filterValue = change.filterValue;
          const keyValue = change.item.displayKey.split('|').pop() ?? change.item.displayKey;

          return `(${def.filterColumn} = ${this.sqlLiteral(filterValue)} AND ${def.keyColumn} = ${this.sqlLiteral(keyValue)})`;
        })
        .filter(Boolean);

      ifNotExistsWhere = `WHERE ${conditions.join('\n            OR ')}`;
      selectWhere = conditions.join('\n                OR ');
    }

    return [
      `    /*=========================================================`,
      `     * Insertar en ${def.tableName} los registros que no existan`,
      `    =========================================================*/`,
      `    IF NOT EXISTS`,
      `    (`,
      `        SELECT 1`,
      `        FROM dbo.${def.tableName}`,
      `        ${ifNotExistsWhere}`,
      `    )`,
      `    BEGIN TRY`,
      identityOn +
      `        INSERT INTO dbo.${def.tableName}`,
      `        (`,
      `            ${columns.join(',\n            ')}`,
      `        )`,
      `        SELECT`,
      `            ${columns.join(',\n            ')}`,
      `        FROM ${instance.sourcePrefix}.${def.tableName}`,
      `        WHERE ${selectWhere};` +
      identityOff,
      `    END TRY`,
      `    BEGIN CATCH`,
      catchIdentity + `        THROW;`,
      `    END CATCH;`,
    ].filter(Boolean).join('\n');
  }

  // ==================== UPDATE ====================

  private buildUpdatesBlock(
    def: TableDefinition,
    changes: PendingChange[],
    instance: any,
    direction: string
  ): string {
    // ---- SIMPLE ----
    if (def.updateStrategy === 'SIMPLE') {
      const updates = changes.map(change => {
        const row = direction === 'TEST_TO_PROD' ? change.item.testRaw : change.item.prodRaw;
        if (!row) return '';

        const setClauses = def.valueColumns
          .map(col => `        ${col} = ${this.sqlLiteral(row[col])}`)
          .join(',\n');

        const whereColumns = Array.from(new Set([def.filterColumn, def.keyColumn]));
        const whereConditions = whereColumns
          .map(col => {
            if (col === def.filterColumn) {
              return `        ${col} = @${def.filterColumn}`;
            }
            return `        ${col} = ${this.sqlLiteral(change.item.displayKey.split('|')[0])}`;
          })
          .join('\n        AND ');

        return [
          `    /* UPDATE ${def.keyColumn}=${change.item.displayKey} */`,
          `    UPDATE dbo.${def.tableName}`,
          `    SET`,
          setClauses,
          `    WHERE ${whereConditions};`,
        ].join('\n');
      });
      return updates.join('\n\n');
    }

    // ---- COMPOSITE_KEY (patrón nuevo) ----
    // UPDATE D SET D.col = O.col
    // FROM dbo.<tabla> D
    // INNER JOIN <origen>.<tabla> O ON D.<filterColumn> = O.<filterColumn>
    // WHERE O.<keyColumn> = '...' AND O.<filterColumn> = <valor>;
   const updates = changes.map(change => {
    const row = direction === 'TEST_TO_PROD' ? change.item.testRaw : change.item.prodRaw;
    if (!row) return '';

    const compositeKeys = def.compositeKeys ?? [def.keyColumn];

    // SET D.col = O.col para cada valueColumn
    const setClauses = def.valueColumns
      .map(col => `        D.${col} = O.${col}`)
      .join(',\n');

    // INNER JOIN ON D.key = O.key para CADA composite key
    const joinConditions = compositeKeys
      .map(col => `D.${col} = O.${col}`)
      .join(' AND ');

    // WHERE O.key = <valor exacto del row>
    const whereConditions = compositeKeys
      .map(col => `O.${col} = ${this.sqlLiteral(row[col])}`)
      .join(' AND ');

    return [
      `    /* UPDATE ${compositeKeys.map(c => `${c}=${row[c]}`).join(', ')} */`,
      `    UPDATE D`,
      `    SET`,
      setClauses,
      `    FROM   ${def.tableName} D`,
      `    INNER JOIN ${instance.sourcePrefix}.${def.tableName} O`,
      `           ON ${joinConditions}`,
      `    WHERE  ${whereConditions};`,
    ].join('\n');
  });
  return updates.join('\n\n');
}

  // ==================== HELPERS ====================

  private resolveInstances(def: TableDefinition): string[] {
    if (def.targetInstance === 'BOTH') return ['PROJECT5X', 'CADCORE'];
    if (def.targetInstance === 'CADCORE') return ['CADCORE'];
    return ['PROJECT5X'];
  }

  private sqlLiteral(value: unknown): string {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return value ? '1' : '0';
    const escaped = String(value).replace(/'/g, "''");
    return `'${escaped}'`;
  }
}