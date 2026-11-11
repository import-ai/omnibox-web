type Page = 'login' | 'register';
let presentation = 0;
const listeners = new Set<(page: Page) => void>();

export function markAuthPagePresentation() {
  presentation += 1;
}

export function subscribeAuthPageReturn(listener: (page: Page) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Ignore duplicate SDK callbacks and returns already observed through visibility.
export function createAuthPageReturnNotifier(page: Page) {
  const startedAt = presentation;
  let consumed = false;
  return () => {
    if (consumed) return;
    consumed = true;
    if (presentation !== startedAt) return;
    listeners.forEach(listener => listener(page));
  };
}
