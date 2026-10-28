
import type { IdDatabaseRepository } from '../../domain/ports/IDatabaseRepository'; 
import type { Enviroment } from '../../domain/entities/TableConfig'; 
import { getConnectionPool } from '../database/sqlServerConnection'; 
import type { TableDefinitions } from '../../domain/config/tableDefinitions';

export class SqlServerTableRepository implements IdDatabaseRepository {
  
    //Test de coneccion, se realiza el selec 1 que devuelve respuesta si conecto correctamente.
  async testConnection(env: Enviroment): Promise<boolean> {
    try {
      const pool = await getConnectionPool(env);
      await pool.request().query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

    async getRecordsByFilter(definition: TableDefinitions, filterValue: string | number, env: Enviroment): Promise<Record<string, unknown>[]> {
       const pool = await getConnectionPool(env);
       
       //Tabla de TABLE_DEFINITIOS LISTA CONTROLADA
        const query = `
          SELECT *
          FROM ${definition.tableName}
          WHERE ${definition.filterColumn} = @filterValue`;

        const request = pool.request().input('filterValue', filterValue);
        const result = await request.query(query);

        return result.recordset as Record<string, unknown>[];
    }


}