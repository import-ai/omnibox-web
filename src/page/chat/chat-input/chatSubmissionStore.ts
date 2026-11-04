import { create } from 'zustand';

interface SubmissionPreparation {
  namespaceId: string | undefined;
  userId: string;
}

export const useChatSubmissionStore = create<{
  pending: Record<string, SubmissionPreparation>;
}>(() => ({ pending: {} }));

function getUserId() {
  return typeof localStorage === 'undefined'
    ? ''
    : localStorage.getItem('uid') || '';
}

/** Own the create/upload phase independently of the mounted composer. */
export function beginChatSubmissionPreparation(
  namespaceId: string | undefined,
  draftScope: string
) {
  const userId = getUserId();
  const key = JSON.stringify([userId, namespaceId, draftScope]);
  if (useChatSubmissionStore.getState().pending[key]) return undefined;
  useChatSubmissionStore.setState(state => ({
    pending: { ...state.pending, [key]: { namespaceId, userId } },
  }));
  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    useChatSubmissionStore.setState(state => {
      const pending = { ...state.pending };
      delete pending[key];
      return { pending };
    });
  };
}

function hasPendingPreparation(
  pending: Record<string, SubmissionPreparation>,
  namespaceId: string
) {
  const userId = getUserId();
  return Object.values(pending).some(
    item => item.namespaceId === namespaceId && item.userId === userId
  );
}

export function isChatSubmissionPreparing(namespaceId: string) {
  return hasPendingPreparation(
    useChatSubmissionStore.getState().pending,
    namespaceId
  );
}

export function useChatSubmissionPreparing(namespaceId: string) {
  return useChatSubmissionStore(state =>
    hasPendingPreparation(state.pending, namespaceId)
  );
}
