export interface SelectionContext {
  customer: CustomerRef | null;
  product: ProductRef | null;
  subProduct: SubProductRef | null;
  resource: ResourceRef | null;
}

export interface CustomerRef {
  nit: string;
  name: string;
}

export interface ProductRef {
  productId: number;
  name: string;
  customerNit: string;
}

export interface SubProductRef {
  subProductId: number;
  name: string;
  productId: number;
}

export interface ResourceRef {
  resourcesId: number;
  space: string;
  productId: number;
}

export const EMPTY_CONTEXT: SelectionContext = {
  customer: null,
  product: null,
  subProduct: null,
  resource: null,
};