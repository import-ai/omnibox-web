const SIDEBAR_SESSION_STORAGE_KEY = 'workspace-sidebar-state';
const DEFAULT_SIDEBAR_WIDTH = 248;
const MIN_SIDEBAR_WIDTH = 248;
const MAX_SIDEBAR_WIDTH = 360;

export interface SidebarSessionState {
  open: boolean;
  width: number;
}

const defaultState: SidebarSessionState = {
  open: true,
  width: DEFAULT_SIDEBAR_WIDTH,
};

function getSessionStorage(): Storage | undefined {
  if (typeof sessionStorage === 'undefined') return undefined;
  try {
    return sessionStorage;
  } catch {
    return undefined;
  }
}

function normalizeWidth(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_SIDEBAR_WIDTH;
  }
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, value));
}

/** Reads validated sidebar layout state for the current browser tab. */
export function readSidebarSessionState(
  storage = getSessionStorage()
): SidebarSessionState {
  if (!storage) return defaultState;
  try {
    const value = storage.getItem(SIDEBAR_SESSION_STORAGE_KEY);
    if (!value) return defaultState;
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return defaultState;
    return {
      open:
        'open' in parsed && typeof parsed.open === 'boolean'
          ? parsed.open
          : defaultState.open,
      width:
        'width' in parsed ? normalizeWidth(parsed.width) : defaultState.width,
    };
  } catch {
    return defaultState;
  }
}

/** Persists sidebar layout state for refreshes in the current browser tab. */
export function writeSidebarSessionState(
  state: SidebarSessionState,
  storage = getSessionStorage()
) {
  if (!storage) return;
  try {
    storage.setItem(
      SIDEBAR_SESSION_STORAGE_KEY,
      JSON.stringify({ open: state.open, width: normalizeWidth(state.width) })
    );
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}
