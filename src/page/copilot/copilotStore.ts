import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type CopilotView = 'home' | 'conversation' | 'history';

export interface CopilotWorkspaceState {
  open: boolean;
  view: CopilotView;
  conversationId: string | null;
  previewResourceId: string | null;
}

interface CopilotState {
  workspaces: Record<string, CopilotWorkspaceState>;
  open: (namespaceId: string) => void;
  close: (namespaceId: string) => void;
  toggle: (namespaceId: string) => void;
  showHome: (namespaceId: string) => void;
  showHistory: (namespaceId: string) => void;
  showConversation: (namespaceId: string, conversationId: string) => void;
  previewResource: (namespaceId: string, resourceId: string) => void;
  closePreview: (namespaceId: string) => void;
  reset: (namespaceId: string) => void;
  clearAll: () => void;
}

const defaultWorkspace: CopilotWorkspaceState = {
  open: false,
  view: 'home',
  conversationId: null,
  previewResourceId: null,
};

export function getCopilotWorkspace(
  state: Pick<CopilotState, 'workspaces'>,
  namespaceId: string
): CopilotWorkspaceState {
  return state.workspaces[namespaceId] ?? defaultWorkspace;
}

function patchWorkspace(
  state: Pick<CopilotState, 'workspaces'>,
  namespaceId: string,
  patch: Partial<CopilotWorkspaceState>
) {
  return {
    ...state.workspaces,
    [namespaceId]: {
      ...getCopilotWorkspace(state, namespaceId),
      ...patch,
    },
  };
}

const storage = createJSONStorage(() => ({
  getItem: (name: string) =>
    typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(name),
  setItem: (name: string, value: string) => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(name, value);
    }
  },
  removeItem: (name: string) => {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(name);
  },
}));

export const useCopilotStore = create<CopilotState>()(
  persist(
    set => ({
      workspaces: {},
      open: namespaceId =>
        set(state => ({
          workspaces: patchWorkspace(state, namespaceId, { open: true }),
        })),
      close: namespaceId =>
        set(state => ({
          workspaces: patchWorkspace(state, namespaceId, {
            open: false,
            previewResourceId: null,
          }),
        })),
      toggle: namespaceId =>
        set(state => {
          const current = getCopilotWorkspace(state, namespaceId);
          return {
            workspaces: patchWorkspace(state, namespaceId, {
              open: !current.open,
              previewResourceId: current.open
                ? null
                : current.previewResourceId,
            }),
          };
        }),
      showHome: namespaceId =>
        set(state => ({
          workspaces: patchWorkspace(state, namespaceId, {
            open: true,
            view: 'home',
            conversationId: null,
          }),
        })),
      showHistory: namespaceId =>
        set(state => ({
          workspaces: patchWorkspace(state, namespaceId, {
            open: true,
            view: 'history',
            conversationId: null,
          }),
        })),
      showConversation: (namespaceId, conversationId) =>
        set(state => ({
          workspaces: patchWorkspace(state, namespaceId, {
            open: true,
            view: 'conversation',
            conversationId,
          }),
        })),
      previewResource: (namespaceId, resourceId) =>
        set(state => ({
          workspaces: patchWorkspace(state, namespaceId, {
            open: true,
            previewResourceId: resourceId,
          }),
        })),
      closePreview: namespaceId =>
        set(state => ({
          workspaces: patchWorkspace(state, namespaceId, {
            previewResourceId: null,
          }),
        })),
      reset: namespaceId =>
        set(state => {
          const workspaces = { ...state.workspaces };
          delete workspaces[namespaceId];
          return { workspaces };
        }),
      clearAll: () => set({ workspaces: {} }),
    }),
    {
      name: 'copilot-workspaces',
      storage,
      partialize: state => ({ workspaces: state.workspaces }),
    }
  )
);
