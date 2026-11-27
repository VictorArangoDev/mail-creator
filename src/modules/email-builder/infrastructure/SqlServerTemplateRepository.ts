import sql from 'mssql';
import type { ITemplateRepository } from '../domain/ports/ITemplateRepository';
import type { NewTemplate, Template, TemplateSummary } from '../domain/entities/Template';
import type { Enviroment } from '../../../compared/domain/entities/TableConfig';
import { getConnectionPool } from '../../../compared/infrastructure/database/sqlServerConnection';

const toIso = (value: Date | string): string => new Date(value).toISOString();

interface SummaryRow {
  Id: number;
  Name: string;
  Version: number;
  CreatedAt: Date;
}

const toSummary = (row: SummaryRow): TemplateSummary => ({
  id: row.Id,
  name: row.Name,
  version: row.Version,
  createdAt: toIso(row.CreatedAt),
});

export class SqlServerTemplateRepository implements ITemplateRepository {
  constructor(private readonly env: Enviroment = 'TEST') {}

  async save(template: NewTemplate): Promise<TemplateSummary> {
    const pool = await getConnectionPool(this.env);
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // UPDLOCK + HOLDLOCK evita que dos guardados simultáneos calculen la misma versión.
      const result = await new sql.Request(transaction)
        .input('name', sql.NVarChar(200), template.name)
        .input('design', sql.NVarChar(sql.MAX), JSON.stringify(template.design))
        .input('html', sql.NVarChar(sql.MAX), template.html)
        .query<SummaryRow>(`
          DECLARE @version INT = (
            SELECT ISNULL(MAX(Version), 0) + 1
            FROM dbo.EmailTemplates WITH (UPDLOCK, HOLDLOCK)
            WHERE Name = @name
          );

          INSERT INTO dbo.EmailTemplates (Name, Version, DesignJson, Html)
          OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.Version, INSERTED.CreatedAt
          VALUES (@name, @version, @design, @html);
        `);

      await transaction.commit();
      return toSummary(result.recordset[0]);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async getById(id: number): Promise<Template | null> {
    const pool = await getConnectionPool(this.env);
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .query<SummaryRow & { DesignJson: string; Html: string }>(`
        SELECT Id, Name, Version, CreatedAt, DesignJson, Html
        FROM dbo.EmailTemplates
        WHERE Id = @id
      `);

    const row = result.recordset[0];
    if (!row) return null;

    return {
      ...toSummary(row),
      design: JSON.parse(row.DesignJson),
      html: row.Html,
    };
  }

  async list(name?: string): Promise<TemplateSummary[]> {
    const pool = await getConnectionPool(this.env);
    const result = await pool
      .request()
      .input('name', sql.NVarChar(200), name ?? null)
      .query<SummaryRow>(`
        SELECT TOP (200) Id, Name, Version, CreatedAt
        FROM dbo.EmailTemplates
        WHERE (@name IS NULL OR Name = @name)
        ORDER BY CreatedAt DESC, Id DESC
      `);

    return result.recordset.map(toSummary);
  }
}
