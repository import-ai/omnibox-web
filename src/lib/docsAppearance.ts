import { http } from '@/lib/request';

const pendingKey = 'omnibox-docs-appearance';
const requests = new Map<string, Promise<void>>();

function currentMode() {
  try {
    const mode = JSON.parse(localStorage.getItem('theme') || 'null')?.skin;
    return ['light', 'dark', 'system'].includes(mode) ? mode : null;
  } catch {
    return null;
  }
}

export function getPendingDocsAppearance(userId: string | null) {
  if (!userId) return null;
  try {
    const pending = JSON.parse(localStorage.getItem(pendingKey) || 'null');
    if (
      pending?.user_id === userId &&
      ['light', 'dark', 'system'].includes(pending.mode)
    ) {
      const activeMode = currentMode();
      if (activeMode && activeMode !== pending.mode) return null;
      return pending as { user_id: string; mode: 'light' | 'dark' | 'system' };
    }
  } catch {
    // Ignore inaccessible or malformed browser preferences.
  }
  return null;
}

export function persistDocsAppearance(userId: string | null): Promise<void> {
  if (!userId) return Promise.resolve();
  const existing = requests.get(userId);
  if (existing) return existing;
  const request = (async () => {
    while (localStorage.getItem('uid') === userId) {
      const pending = getPendingDocsAppearance(userId);
      if (!pending) return;
      const snapshot = localStorage.getItem(pendingKey);
      await http.post('/user/option', { name: 'theme', value: pending.mode });
      if (localStorage.getItem('uid') !== userId) return;
      const activeMode = currentMode();
      // Another tab may have saved and acknowledged a newer choice already.
      // Reconcile stale writes even when that tab removed the pending marker.
      if (activeMode && activeMode !== pending.mode) {
        if (!getPendingDocsAppearance(userId)) {
          localStorage.setItem(
            pendingKey,
            JSON.stringify({ user_id: userId, mode: activeMode })
          );
        }
      } else if (localStorage.getItem(pendingKey) === snapshot) {
        localStorage.removeItem(pendingKey);
      }
    }
  })().finally(() => requests.delete(userId));
  requests.set(userId, request);
  return request;
}
