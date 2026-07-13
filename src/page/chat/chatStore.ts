import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { normalizeResourceContexts } from './chat-input/resourceContexts';
import type {
  IResTypeContext,
  PrivateSearchResourceType,
} from './chat-input/types';

interface ChatState {
  inputResetNonce: number;
  selectedResources: IResTypeContext[];
  addContext: (
    resource: IResTypeContext['resource'],
    type: PrivateSearchResourceType
  ) => void;
  removeContext: (resourceId: string) => void;
  clearContext: () => void;
  requestChatInputReset: () => void;
  setContext: (resources: IResTypeContext[]) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    immer(set => ({
      inputResetNonce: 0,
      selectedResources: [],
      addContext: (resource, type) =>
        set(state => {
          state.selectedResources = normalizeResourceContexts([
            ...state.selectedResources,
            { type, resource },
          ]);
        }),
      removeContext: resourceId =>
        set(state => {
          state.selectedResources = state.selectedResources.filter(
            item => item.resource.id !== resourceId
          );
        }),
      clearContext: () =>
        set(state => {
          state.selectedResources = [];
        }),
      requestChatInputReset: () =>
        set(state => {
          state.inputResetNonce += 1;
        }),
      setContext: resources =>
        set({ selectedResources: normalizeResourceContexts(resources) }),
    })),
    {
      name: 'chat_context',
      merge: (persistedState, currentState) => {
        if (Array.isArray(persistedState)) {
          return {
            ...currentState,
            selectedResources: normalizeResourceContexts(persistedState),
          };
        }
        const partialState =
          persistedState && typeof persistedState === 'object'
            ? (persistedState as Partial<ChatState>)
            : {};
        return {
          ...currentState,
          ...partialState,
          inputResetNonce: currentState.inputResetNonce,
          selectedResources: normalizeResourceContexts(
            partialState.selectedResources ?? currentState.selectedResources
          ),
        };
      },
      partialize: state => ({ selectedResources: state.selectedResources }),
    }
  )
);
