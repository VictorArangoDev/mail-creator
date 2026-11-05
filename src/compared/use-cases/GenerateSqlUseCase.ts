import type { PendingChange, GenerateScript, CartContext } from '../domain/entities/PendingChange';
import type { TableDefinition } from '../domain/config/tableDefinitions';
import { INSTANCES } from '../domain/config/instances'; 

interface GenerateOptions {
  direction?: 'TEST_TO_PROD' | 'PROD_TO_TEST';
  includeTransaction?: boolean;
}

export class GenerateSqlUseCase {

  execute(changes: PendingChange[], options: GenerateOptions = {}): GenerateScript {
    const { direction = 'TEST_TO_PROD', includeTransaction = true } = options;

    // Agrupar por instancia destino → por tabla
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

    // 1. Header
    parts.push(this.buildHeader(instance, tableMap.size, direction));

    // 2. USE + SET XACT_ABORT
    parts.push(`USE ${instance.targetDb};\nGO`);
    parts.push(`SET XACT_ABORT ON;\nGO`);

    // 3. BEGIN TRY / BEGIN TRANSACTION
    if (includeTransaction) {
      parts.push(`BEGIN TRY\n    BEGIN TRANSACTION;`);
    }

    // 4. Variables + validación de CustomerNit
    const context = this.collectContext(tableMap);
    if (context) {
      parts.push(this.buildContextBlock(context));
    }

    // 5. Bloque por tabla
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

    // 6. COMMIT / CATCH
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
      ` * Migración a Producción`,
      ` * Aplicar en la instancia: ${dst}`,
      ` * Instancia de pruebas vinculada: ${src}`,
      ` * Generado: ${now}`,
      ` * Tablas: ${totalTables}`,
      '=========================================================*/',
    ].join('\n');
  }

  /**
   * Extrae el customerNit y el/los filtros del contexto para declararlos como variables
   * y validarlos al inicio del script.
   */
  private collectContext(tableMap: Map<string, PendingChange[]>): CartContext & { filters: Map<string, any> } | null {
    const filters = new Map<string, any>();
    let customerNit: string | null = null;
    let productId: number | null = null;

    for (const changes of tableMap.values()) {
      for (const change of changes) {
        // Filtros únicos
        const filterCol = change.definition.filterColumn;
        if (!filters.has(filterCol)) filters.set(filterCol, change.filterValue);

        // Contexto
        if (change.context.customerNit) customerNit = change.context.customerNit;
        if (change.context.productId) productId = change.context.productId;
      }
    }

    if (filters.size === 0) return null;
    return { customerNit, productId, filters };
  }

  private buildContextBlock(ctx: any): string {
    const lines: string[] = [];

    lines.push('    /*=========================================================');
    lines.push('     * Definir variables del producto a migrar');
    lines.push('    =========================================================*/');

    if (ctx.customerNit) {
      lines.push(`    DECLARE @CustomerNit BIGINT = ${ctx.customerNit};`);
    }
    for (const [name, value] of ctx.filters.entries()) {
      const type = typeof value === 'number' ? 'INT' : 'NVARCHAR(100)';
      lines.push(`    DECLARE @${name} ${type} = ${this.sqlLiteral(value)};`);
    }

    // Validación del CustomerNit (siempre, confirmado por el usuario)
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

    const warnings = changes.filter(c => c.item.status === 'NUEVO_EN_PROD' && direction === 'TEST_TO_PROD');
    const inserts = changes.filter(c => c.item.status === 'NUEVO_EN_TEST' && direction === 'TEST_TO_PROD');
    const updates = changes.filter(c => c.item.status === 'DIFERENTE');

    for (const w of warnings) {
      parts.push(`    -- [WARNING] ${def.keyColumn}=${w.item.displayKey}: existe en PROD, no en TEST. Revisar manualmente.`);
      warningCount++;
    }

    for (const insert of inserts) {
      parts.push(this.buildInsertBlock(def, insert, instance, direction));
      insertCount++;
    }

    if (updates.length > 0) {
      parts.push(this.buildUpdatesBlock(def, updates, instance, direction));
      updateCount += updates.length;
    }

    return { block: parts.join('\n\n'), updates: updateCount, inserts: insertCount, warnings: warningCount };
  }

  /**
   * Construye un bloque INSERT con IF NOT EXISTS e IDENTITY_INSERT si aplica.
   * Usa las compositeKeys para el WHERE si es COMPOSITE_KEY.
   */
  private buildInsertBlock(
    def: TableDefinition,
    change: PendingChange,
    instance: any,
    direction: string
  ): string {
    const row = direction === 'TEST_TO_PROD' ? change.item.testRaw : change.item.prodRaw;
    if (!row) return '';

    const columns = def.insertColumns ?? [def.filterColumn, def.keyColumn, ...def.valueColumns];
    const sourcePrefix = instance.sourcePrefix;

    // Llaves lógicas para el WHERE del IF NOT EXISTS
    const keys = def.updateStrategy === 'COMPOSITE_KEY'
      ? (def.compositeKeys ?? [def.keyColumn])
      : [def.filterColumn, def.keyColumn];

    const whereConditions = keys
      .map(col => `            ${col} = ${this.sqlLiteral(row[col])}`)
      .join('\n            AND ');

    // WHERE del SELECT (para traer la fila del origen)
    const selectWhere = keys
      .map(col => `${col} = ${this.sqlLiteral(row[col])}`)
      .join(' AND ');

    const identityOn = def.hasIdentity && def.identityColumn
      ? `        SET IDENTITY_INSERT dbo.${def.tableName} ON;\n`
      : '';
    const identityOff = def.hasIdentity && def.identityColumn
      ? `\n        SET IDENTITY_INSERT dbo.${def.tableName} OFF;`
      : '';

    const catchIdentity = def.hasIdentity && def.identityColumn
      ? `        SET IDENTITY_INSERT dbo.${def.tableName} OFF;\n`
      : '';

    return [
      `    /* Insertar en ${def.tableName} */`,
      `    IF NOT EXISTS`,
      `    (`,
      `        SELECT 1`,
      `        FROM dbo.${def.tableName}`,
      `        WHERE ${whereConditions}`,
      `    )`,
      `    BEGIN TRY`,
      identityOn +
      `        INSERT INTO dbo.${def.tableName}`,
      `        (`,
      `            ${columns.join(',\n            ')}`,
      `        )`,
      `        SELECT`,
      `            ${columns.join(',\n            ')}`,
      `        FROM ${sourcePrefix}.${def.tableName}`,
      `        WHERE ${selectWhere};`,
      identityOff,
      `    END TRY`,
      `    BEGIN CATCH`,
      catchIdentity + `        THROW;`,
      `    END CATCH;`,
    ].filter(Boolean).join('\n');
  }

  private buildUpdatesBlock(
    def: TableDefinition,
    changes: PendingChange[],
    instance: any,
    direction: string
  ): string {
    if (def.updateStrategy === 'SIMPLE') {
      const updates = changes.map(change => {
        const row = direction === 'TEST_TO_PROD' ? change.item.testRaw : change.item.prodRaw;
        if (!row) return '';

        const setClauses = def.valueColumns
          .map(col => `        ${col} = ${this.sqlLiteral(row[col])}`)
          .join(',\n');

        const whereKey = String(change.item.displayKey).split('|')[0];

        return [
          `    /* UPDATE ${def.keyColumn}=${whereKey} */`,
          `    UPDATE dbo.${def.tableName}`,
          `    SET`,
          setClauses,
          `    WHERE ${def.filterColumn} = @${def.filterColumn}`,
          `        AND ${def.keyColumn} = ${this.sqlLiteral(whereKey)};`,
        ].join('\n');
      });
      return updates.join('\n\n');
    }

    if (def.updateStrategy === 'COMPOSITE_KEY') {
      const updates = changes.map(change => {
        const row = direction === 'TEST_TO_PROD' ? change.item.testRaw : change.item.prodRaw;
        if (!row) return '';

        const setClauses = def.valueColumns
          .map(col => `        D.${col} = O.${col}`)
          .join(',\n');

        const joinConditions = (def.compositeKeys ?? [def.keyColumn])
          .map(col => `D.${col} = O.${col}`)
          .join(' AND ');

        const whereConditions = (def.compositeKeys ?? [def.keyColumn])
          .map(col => `O.${col} = ${this.sqlLiteral(row[col])}`)
          .join('\n            AND ');

        return [
          `    /* UPDATE COMPOSITE ${(def.compositeKeys ?? [def.keyColumn]).join(' + ')} */`,
          `    UPDATE D`,
          `    SET`,
          setClauses,
          `    FROM   dbo.${def.tableName} D`,
          `    INNER JOIN ${instance.sourcePrefix}.${def.tableName} O`,
          `           ON ${joinConditions}`,
          `    WHERE  ${whereConditions};`,
        ].join('\n');
      });
      return updates.join('\n\n');
    }

    return '';
  }

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