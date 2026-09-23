export type SidebarBrowseTab = 'resources' | 'chats';

function getStorageKey(namespaceId: string): string {
  return `sidebar-browse-tab:${JSON.stringify([
    localStorage.getItem('uid'),
    namespaceId,
  ])}`;
}

export function readSidebarBrowseTab(namespaceId: string): SidebarBrowseTab {
  try {
    const value = localStorage.getItem(getStorageKey(namespaceId));
    return value === 'chats' ? 'chats' : 'resources';
  } catch {
    console.warn(
      'Unable to restore the sidebar browse tab from local storage.'
    );
    return 'resources';
  }
}

export function writeSidebarBrowseTab(
  namespaceId: string,
  tab: SidebarBrowseTab
): void {
  try {
    localStorage.setItem(getStorageKey(namespaceId), tab);
  } catch {
    console.warn('Unable to save the sidebar browse tab to local storage.');
  }
}
