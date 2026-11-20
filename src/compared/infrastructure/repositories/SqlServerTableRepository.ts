import type { IDatabaseRepository } from '../../domain/ports/IDatabaseRepository';
import type { TableDefinition } from '../../domain/config/tableDefinitions';
import { getConnectionPool, type ConnectionEnv } from '../database/sqlServerConnection';

export class SqlServerTableRepository implements IDatabaseRepository {

 async testConnection(connectionEnv: ConnectionEnv): Promise<boolean> {
  try {
    const pool = await getConnectionPool(connectionEnv);
    await pool.request().query('SELECT 1');
    return true;
  } catch (error: any) {
    console.error(`❌ testConnection(${connectionEnv}) falló:`, {
      message: error.message,
      code: error.code,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
    });
    return false;
  }
}

  async getRecordsByFilter(
    definition: TableDefinition,
    filterValue: string | number,
    connectionEnv: ConnectionEnv
  ): Promise<Record<string, unknown>[]> {
    const pool = await getConnectionPool(connectionEnv);
    const query = `
      SELECT *
      FROM ${definition.tableName}
      WHERE ${definition.filterColumn} = @filterValue
    `;
    const request = pool.request().input('filterValue', filterValue);
    const result = await request.query(query);
    return result.recordset as Record<string, unknown>[];
  }
}