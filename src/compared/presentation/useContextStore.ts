import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SelectionContext } from '../domain/entities/SelectionContext'; 
import { EMPTY_CONTEXT } from '../domain/entities/SelectionContext'; 

interface ContextState {
  context: SelectionContext;
  setCustomer: (customer: SelectionContext['customer']) => void;
  setProduct: (product: SelectionContext['product']) => void;
  setSubProduct: (subProduct: SelectionContext['subProduct']) => void;
  setResource: (resource: SelectionContext['resource']) => void;
  clearAll: () => void;
  clearFrom: (level: 'customer' | 'product' | 'subProduct' | 'resource') => void;
}

export const useContextStore = create<ContextState>()(
  persist(
    (set) => ({
      context: EMPTY_CONTEXT,

      setCustomer: (customer) =>
        set(() => ({
          context: { ...EMPTY_CONTEXT, customer },
        })),

      setProduct: (product) =>
        set((state) => ({
          context: {
            ...state.context,
            product,
            subProduct: null,
            resource: null,
          },
        })),

      setSubProduct: (subProduct) =>
        set((state) => ({
          context: { ...state.context, subProduct },
        })),

      setResource: (resource) =>
        set((state) => ({
          context: { ...state.context, resource },
        })),

      clearAll: () => set({ context: EMPTY_CONTEXT }),

      clearFrom: (level) =>
        set((state) => {
          if (level === 'customer') return { context: EMPTY_CONTEXT };
          if (level === 'product') {
            return {
              context: { ...state.context, product: null, subProduct: null, resource: null },
            };
          }
          if (level === 'subProduct') {
            return { context: { ...state.context, subProduct: null } };
          }
          return { context: { ...state.context, resource: null } };
        }),
    }),
    { name: 'db-promote-context' }
  )
);