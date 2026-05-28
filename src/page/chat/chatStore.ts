import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type {
  IResTypeContext,
  PrivateSearchResourceType,
} from './chat-input/types';

interface ChatState {
  selectedResources: IResTypeContext[];
  addContext: (
    resource: IResTypeContext['resource'],
    type: PrivateSearchResourceType
  ) => void;
  removeContext: (resourceId: string) => void;
  clearContext: () => void;
  setContext: (resources: IResTypeContext[]) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    immer(set => ({
      selectedResources: [],
      addContext: (resource, type) =>
        set(state => {
          const existingIndex = state.selectedResources.findIndex(
            item => item.resource.id === resource.id
          );

          if (existingIndex >= 0) {
            state.selectedResources[existingIndex] = { type, resource };
          } else {
            state.selectedResources.push({ type, resource });
          }
        }),
      removeContext: resourceId =>
        set(state => {
          state.selectedResources = state.selectedResources.filter(
            item => item.resource.id !== resourceId
          );
        }),
      clearContext: () => set({ selectedResources: [] }),
      setContext: resources => set({ selectedResources: resources }),
    })),
    {
      name: 'chat_context',
      merge: (persistedState, currentState) => {
        if (Array.isArray(persistedState)) {
          return {
            ...currentState,
            selectedResources: persistedState,
          };
        }
        return {
          ...currentState,
          ...(persistedState as Partial<ChatState>),
        };
      },
      partialize: state => ({ selectedResources: state.selectedResources }),
    }
  )
);
