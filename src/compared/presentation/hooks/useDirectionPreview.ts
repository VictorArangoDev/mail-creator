import { useMemo } from 'react';
import type { PendingChange } from '../../domain/entities/PendingChange'; 
import type { SyncDirection } from '../useCartStore'; 

interface PreviewStats {
  updates: number;
  inserts: number;
  warnings: number;
  tables: number;
}

/**
 * Calcula cuántos UPDATE / INSERT / WARNING se van a generar,
 * en función de la dirección elegida.
 *
 * Regla:
 *   TEST → PROD:
 *     - DIFERENTE       → UPDATE
 *     - NUEVO_EN_TEST   → INSERT
 *     - NUEVO_EN_PROD   → WARNING
 *   PROD → TEST (invertido):
 *     - DIFERENTE       → UPDATE
 *     - NUEVO_EN_PROD   → INSERT
 *     - NUEVO_EN_TEST   → WARNING
 */
export function useDirectionPreview(
  changes: PendingChange[],
  direction: SyncDirection
): PreviewStats {
  return useMemo(() => {
    let updates = 0;
    let inserts = 0;
    let warnings = 0;

    for (const change of changes) {
      if (change.item.status === 'DIFERENTE') {
        updates++;
      } else if (direction === 'TEST_TO_PROD') {
        if (change.item.status === 'NUEVO_EN_TEST') inserts++;
        if (change.item.status === 'NUEVO_EN_PROD') warnings++;
      } else {
        if (change.item.status === 'NUEVO_EN_PROD') inserts++;
        if (change.item.status === 'NUEVO_EN_TEST') warnings++;
      }
    }

    const tables = new Set(changes.map(c => c.definition.tableName)).size;

    return { updates, inserts, warnings, tables };
  }, [changes, direction]);
}