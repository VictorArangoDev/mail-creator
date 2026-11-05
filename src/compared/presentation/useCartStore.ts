import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PendingChange, CartContext } from '../domain/entities/PendingChange'; 
import type { TableDefinition } from '../domain/config/tableDefinitions'; 
import type { ComparisonItem } from '../domain/entities/ComparisonResult';

interface CartState {
  changes: PendingChange[];
  addChanges: (
    def: TableDefinition,
    filterValue: string | number,
    items: ComparisonItem[],
    context: CartContext
  ) => void;
  removeChange: (id: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      changes: [],

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

      clear: () => set({ changes: [] }),
    }),
    { name: 'db-promote-cart' }
  )
);