import type { Enviroment } from "../entities/TableConfig";

export interface CustomerOption{
    nit: string;
    name : string;
    description: string | null;
    label: string;
}

export interface ProductOption {
    productId: string;
    customerNit: string;
    name: string;
    description:string;
    type: string | null;
    label: string;
}

export interface ICatalogRepository {
   /**
   * Búsqueda de customers por NIT exacto o por Name LIKE.
   * Si query está vacío, devuelve los primeros N (para dropdown inicial).
   */
    searchCustomer(query: string, env: Enviroment) : Promise<CustomerOption[]>;


   /**
   * Productos asociados a un NIT (por Product.CustomerNit).
   */
    getProductsByNit(nit:string, env:Enviroment) : Promise<ProductOption[]>;
}