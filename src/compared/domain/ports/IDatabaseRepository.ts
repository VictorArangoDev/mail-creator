import type { TableSettingByProduct, Enviroment } from "../entities/TableConfig";


export interface IdDatabaseRepository {
   /**
   * Obtiene todas las configuraciones de settingByproduc específica en un entorno dado
   */

    getTableSettingsByProductId(tableName:string, productId: number,  env:Enviroment) : Promise<TableSettingByProduct[]>

   /**
   * Verfica el estado de la conexión a la base de datos
   */

   testConnection(env:Enviroment): Promise<Boolean>

}