import type { TableDefinitions } from "../config/tableDefinitions";
import type { Enviroment } from "../entities/TableConfig";


export interface IdDatabaseRepository {
   /**
   * Obtiene informacion de base de datos por filtro
   */

   getRecordsByFilter(definition:TableDefinitions, filterValue:string | number, env:Enviroment) : Promise<Record<string, unknown>[]>;
    

   /**
   * Verfica el estado de la conexión a la base de datos
   */

   testConnection(env:Enviroment): Promise<Boolean>

}