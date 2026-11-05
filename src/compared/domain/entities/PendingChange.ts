import type { ComparisonItem } from "./ComparisonResult";
import type { TableDefinition } from "../config/tableDefinitions";



export interface CartContext {
    customerNit: string | null;
    productId?: number | null;
}


/**
 * Un cambio pendiente de promover.
 * Agrupa un item seleccionado junto con el contexto de la tabla y el filtro.
 */
export interface PendingChange {
   /** ID único para identificar el cambio en el carrito */
  id: string;
  /** Definición completa de la tabla (para conocer estrategia y columnas) */
  definition: TableDefinition;
  /** Filtro usado en la comparación (ej: ProductId = 1965) */
  filterValue: string | number;
  /** Item del diff */
  item: ComparisonItem;
  context: CartContext;
}

/**
 * Script SQL generado con metadata.
 */
export interface GenerateScript {
    sql:string;
    stats: {
        totalChanges: number;
        updates: number;
        inserts: number;
        warnings: number;
        tables : number;
        instances: number;
    };
}