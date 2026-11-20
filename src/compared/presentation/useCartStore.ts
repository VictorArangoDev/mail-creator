import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PendingChange, CartContext } from '../domain/entities/PendingChange'; 
import type { TableDefinition } from '../domain/config/tableDefinitions'; 
import type { ComparisonItem } from '../domain/entities/ComparisonResult';

export type SyncDirection = 'TEST_TO_PROD' | 'PROD_TO_TEST';

interface CartState {
  changes: PendingChange[];
  direction: SyncDirection;

  addChanges: (
    def: TableDefinition,
    filterValue: string | number,
    items: ComparisonItem[],
    context: CartContext
  ) => void;
  removeChange: (id: string) => void;
  removeByTable: (tableName: string) => void;
  clear: () => void;
  setDirection: (direction: SyncDirection) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      changes: [],
      direction: 'TEST_TO_PROD',

      addChanges: (def, filterValue, items, context) => {
        const newChanges: PendingChange[] = items
          .filter(i => i.status !== 'IGUAL')
          .map(i => ({
            id: `${def.tableName}-${String(filterValue)}-${i.displayKey}`,
            definition: def,
            filterValue,
            item: i,
            context,
          }));

        set(state => {
          const existingIds = new Set(state.changes.map(c => c.id));
          const unique = newChanges.filter(c => !existingIds.has(c.id));
          return { changes: [...state.changes, ...unique] };
        });
      },

      removeChange: (id) => {
        set(state => ({ changes: state.changes.filter(c => c.id !== id) }));
      },

      removeByTable: (tableName) => {
        set(state => ({
          changes: state.changes.filter(c => c.definition.tableName !== tableName),
        }));
      },

      clear: () => set({ changes: [] }),

      setDirection: (direction) => set({ direction }),
    }),
    {
      name: 'db-promote-cart',
      partialize: (state) => ({ changes: state.changes, direction: state.direction }),
    }
  )
);