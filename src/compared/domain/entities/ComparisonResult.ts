export type ComparisonStatus = 'IGUAL' | 'DIFERENTE' | 'NUEVO_EN_TEST' | 'NUEVO_EN_PROD';

export interface FieldDifference {
  field: string;
  testValue: unknown;
  prodValue: unknown;
}

export interface ComparisonItem {
  displayKey: string;
  testRaw: Record<string, unknown> | null;
  prodRaw: Record<string, unknown> | null;
  status: ComparisonStatus;
  differences: FieldDifference[];
}

export interface ComparisonStats {
  totalTest: number;
  totalProd: number;
  iguales: number;
  diferentes: number;
  nuevosEnTest: number;
  nuevosEnProd: number;
  totalComparados: number;
}

export interface ComparisonResult {
  tableName: string;
  displayName: string;
  filterValue: string | number;
  filterColumn: string;
  stats: ComparisonStats;
  items: ComparisonItem[];
}