import {
  readSidebarSessionState,
  writeSidebarSessionState,
} from './sidebarSessionState';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => Array.from(values.keys())[index] ?? null,
    removeItem: key => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe('sidebar session state', () => {
  it('restores the expanded state and width for the current tab', () => {
    const storage = memoryStorage();
    writeSidebarSessionState({ open: false, width: 320 }, storage);

    expect(readSidebarSessionState(storage)).toEqual({
      open: false,
      width: 320,
    });
  });

  it('ignores malformed state and clamps an out-of-range width', () => {
    const storage = memoryStorage();
    storage.setItem(
      'workspace-sidebar-state',
      JSON.stringify({ open: 'yes', width: 999 })
    );

    expect(readSidebarSessionState(storage)).toEqual({
      open: true,
      width: 360,
    });
  });
});
