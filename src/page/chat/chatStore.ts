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

export const CHAT_CONTEXT_STORAGE_KEY = 'chat_context';

/** Migrates legacy raw-array `chat_context` values into Zustand persist shape. */
export function readChatContextStorage(raw: string | null): {
  state: Pick<ChatState, 'selectedResources'>;
  version?: number;
} | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (Array.isArray(parsed)) {
    return {
      state: {
        selectedResources: normalizeResourceContexts(parsed),
      },
      version: 0,
    };
  }

  if (!parsed || typeof parsed !== 'object') return null;

  const storageValue = parsed as {
    state?: Partial<ChatState> | IResTypeContext[];
    version?: number;
    selectedResources?: IResTypeContext[];
  };

  let selectedResources: IResTypeContext[] = [];
  if (Array.isArray(storageValue.state)) {
    selectedResources = storageValue.state;
  } else if (Array.isArray(storageValue.state?.selectedResources)) {
    selectedResources = storageValue.state.selectedResources;
  } else if (Array.isArray(storageValue.selectedResources)) {
    selectedResources = storageValue.selectedResources;
  }

  return {
    state: {
      selectedResources: normalizeResourceContexts(selectedResources),
    },
    version: storageValue.version,
  };
}

const chatContextStorage = {
  getItem: (name: string) =>
    readChatContextStorage(
      typeof localStorage === 'undefined' ? null : localStorage.getItem(name)
    ),
  setItem: (
    name: string,
    value: { state: Pick<ChatState, 'selectedResources'>; version?: number }
  ) => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(name, JSON.stringify(value));
  },
  removeItem: (name: string) => {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(name);
  },
};

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
      name: CHAT_CONTEXT_STORAGE_KEY,
      storage: chatContextStorage,
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
          selectedResources: normalizeResourceContexts(
            partialState.selectedResources ?? currentState.selectedResources
          ),
        };
      },
      partialize: state => ({ selectedResources: state.selectedResources }),
    }
  )
);
