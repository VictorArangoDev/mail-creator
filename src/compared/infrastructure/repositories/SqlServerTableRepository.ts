
import type { IdDatabaseRepository } from '../../domain/ports/IDatabaseRepository'; 
import type { TableSettingByProduct ,Enviroment } from '../../domain/entities/TableConfig'; 
import { getConnectionPool } from '../database/sqlServerConnection'; 

export class SqlServerTableRepository implements IdDatabaseRepository {
  
  async testConnection(env: Enviroment): Promise<boolean> {
    try {
      const pool = await getConnectionPool(env);
      await pool.request().query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async getTableSettingsByProductId(tableName: string, productId: number, env: Enviroment): Promise<TableSettingByProduct[]> {
    const pool = await getConnectionPool(env);
    
    const result = await pool.request()
      .input('ProductId', productId)
      .query(`
        SELECT 
          SettingsByProductId, 
          ProductId, 
          SettingId, 
          Value 
        FROM ${tableName}
        WHERE ProductId = @ProductId
      `);

    return result.recordset as TableSettingByProduct[];
  }
}