import type { TableDefinition } from '../config/tableDefinitions';
import type { ConnectionEnv } from '../../infrastructure/database/sqlServerConnection';

export interface IDatabaseRepository {
  getRecordsByFilter(
    definition: TableDefinition,
    filterValue: string | number,
    connectionEnv: ConnectionEnv
  ): Promise<Record<string, unknown>[]>;

  testConnection(connectionEnv: ConnectionEnv): Promise<boolean>;
}