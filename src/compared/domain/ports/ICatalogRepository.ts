import type { ConnectionEnv } from '../../infrastructure/database/sqlServerConnection';

export interface CustomerOption {
  nit: string;
  name: string;
  description: string | null;
  label: string;
}

export interface ProductOption {
  productId: number;
  customerNit: string;
  name: string;
  description: string | null;
  type: string | null;
  label: string;
}

export interface ICatalogRepository {
  searchCustomer(query: string, connectionEnv: ConnectionEnv): Promise<CustomerOption[]>;
  getProductsByNit(nit: string, connectionEnv: ConnectionEnv): Promise<ProductOption[]>;
}