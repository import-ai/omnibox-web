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
  /**
   * Transient per-namespace flag (not persisted). Set while promoting Copilot
   * to full-page chat so the underlying resource Outlet stays covered until the
   * chat route commits.
   */
  pendingExpandFromResource: Record<string, boolean>;
  open: (namespaceId: string) => void;
  close: (namespaceId: string) => void;
  toggle: (namespaceId: string) => void;
  showHome: (namespaceId: string) => void;
  showHistory: (namespaceId: string) => void;
  showConversation: (namespaceId: string, conversationId: string) => void;
  showResourceBesideConversation: (
    namespaceId: string,
    conversationId: string,
    resourceId: string
  ) => void;
  previewResource: (namespaceId: string, resourceId: string) => void;
  closePreview: (namespaceId: string) => void;
  requestExpandFromResource: (namespaceId: string) => void;
  clearPendingExpandFromResource: (namespaceId: string) => void;
  reset: (namespaceId: string) => void;
  clearAll: () => void;
}

export const defaultCopilotWorkspace: CopilotWorkspaceState = {
  open: false,
  view: 'home',
  conversationId: null,
  previewResourceId: null,
};

export function getCopilotWorkspace(
  state: Pick<CopilotState, 'workspaces'>,
  namespaceId: string
): CopilotWorkspaceState {
  return state.workspaces[namespaceId] ?? defaultCopilotWorkspace;
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

function withoutPendingExpand(
  pendingExpandFromResource: Record<string, boolean>,
  namespaceId: string
) {
  if (!pendingExpandFromResource[namespaceId]) return pendingExpandFromResource;
  const next = { ...pendingExpandFromResource };
  delete next[namespaceId];
  return next;
}

export const useCopilotStore = create<CopilotState>()(
  persist(
    set => ({
      workspaces: {},
      pendingExpandFromResource: {},
      open: namespaceId =>
        set(state => ({
          workspaces: patchWorkspace(state, namespaceId, { open: true }),
        })),
      close: namespaceId =>
        set(state => ({
          workspaces: patchWorkspace(state, namespaceId, {
            open: false,
          }),
        })),
      toggle: namespaceId =>
        set(state => {
          const current = getCopilotWorkspace(state, namespaceId);
          return {
            workspaces: patchWorkspace(state, namespaceId, {
              open: !current.open,
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
      showResourceBesideConversation: (
        namespaceId,
        conversationId,
        resourceId
      ) =>
        set(state => ({
          workspaces: patchWorkspace(state, namespaceId, {
            open: true,
            view: 'conversation',
            conversationId,
            previewResourceId: resourceId,
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
      requestExpandFromResource: namespaceId =>
        set(state => ({
          pendingExpandFromResource: {
            ...state.pendingExpandFromResource,
            [namespaceId]: true,
          },
        })),
      clearPendingExpandFromResource: namespaceId =>
        set(state => ({
          pendingExpandFromResource: withoutPendingExpand(
            state.pendingExpandFromResource,
            namespaceId
          ),
        })),
      reset: namespaceId =>
        set(state => {
          const workspaces = { ...state.workspaces };
          delete workspaces[namespaceId];
          return {
            workspaces,
            pendingExpandFromResource: withoutPendingExpand(
              state.pendingExpandFromResource,
              namespaceId
            ),
          };
        }),
      clearAll: () =>
        set({
          workspaces: {},
          pendingExpandFromResource: {},
        }),
    }),
    {
      name: 'copilot-workspaces',
      storage,
      partialize: state => ({ workspaces: state.workspaces }),
    }
  )
);
