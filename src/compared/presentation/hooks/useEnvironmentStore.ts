import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface EnvironmentSelection {
  sourceId: string;   // ej: 'MDEPYD01NEW'
  targetId: string;   // ej: 'PROJECT5X' | 'CADCORE'
}

interface EnvironmentState {
  selection: EnvironmentSelection;
  setSelection: (selection: EnvironmentSelection) => void;
  reset: () => void;
}

const DEFAULT_SELECTION: EnvironmentSelection = {
  sourceId: 'MDEPYD01NEW',
  targetId: 'PROJECT5X',
};

export const useEnvironmentStore = create<EnvironmentState>()(
  persist(
    (set) => ({
      selection: DEFAULT_SELECTION,
      setSelection: (selection) => set({ selection }),
      reset: () => set({ selection: DEFAULT_SELECTION }),
    }),
    { name: 'db-promote-environments' }
  )
);