import type { TableDefinitions } from '../domain/config/tableDefinitions';
import type { ComparisonResult, ComparisonItem, FieldDifference } from '../domain/entities/ComparisonResult';

function normalize(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

export class CompareConfigsUseCase {

  execute(
    definition: TableDefinitions,
    filterValue: string | number,
    testData: Record<string, unknown>[],
    prodData: Record<string, unknown>[]
  ): ComparisonResult {
                                     
    const { keyColumn, valueColumns, compositeKeys } = definition;

    const buildKey = (row: Record<string, unknown>): string => {
      const cols = compositeKeys && compositeKeys.length > 0 ? compositeKeys : [keyColumn];
      return cols.map(c => String(row[c] ?? '')).join('|');
    };

    const testMap = new Map<string, Record<string, unknown>>();
    testData.forEach(r => testMap.set(buildKey(r), r));

    const prodMap = new Map<string, Record<string, unknown>>();
    prodData.forEach(r => prodMap.set(buildKey(r), r));

    const allKeys = new Set<string>([...testMap.keys(), ...prodMap.keys()]);

    const items: ComparisonItem[] = [];
    let iguales = 0, diferentes = 0, nuevosEnTest = 0, nuevosEnProd = 0;

    for (const key of allKeys) {
      const testRow = testMap.get(key) ?? null;
      const prodRow = prodMap.get(key) ?? null;

      let status: ComparisonItem['status'];
      const differences: FieldDifference[] = [];

      if (testRow && prodRow) {
        for (const col of valueColumns) {
          const tVal = normalize(testRow[col]);
          const pVal = normalize(prodRow[col]);
          if (tVal !== pVal) {
            differences.push({ field: col, testValue: testRow[col], prodValue: prodRow[col] });
          }
        }
        status = differences.length === 0 ? 'IGUAL' : 'DIFERENTE';
        if (status === 'IGUAL') iguales++;
        else diferentes++;
      } else if (testRow) {
        status = 'NUEVO_EN_TEST';
        nuevosEnTest++;
      } else {
        status = 'NUEVO_EN_PROD';
        nuevosEnProd++;
      }

      items.push({
        displayKey: key,
        testRaw: testRow,
        prodRaw: prodRow,
        status,
        differences,
      });
    }

    items.sort((a, b) => a.displayKey.localeCompare(b.displayKey, undefined, { numeric: true }));

    return {
      tableName: definition.tableName,
      displayName: definition.displayName,
      filterValue,
      filterColumn: definition.filterColumn,
      keyColumn: definition.keyColumn,
      valueColumns: definition.valueColumns,
      stats: {
        totalTest: testData.length,
        totalProd: prodData.length,
        iguales, diferentes, nuevosEnTest, nuevosEnProd,
        totalComparados: items.length,
      },
      items,
    };
  }
}