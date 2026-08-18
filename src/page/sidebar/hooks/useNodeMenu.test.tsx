/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { isSmartFolderChildResource } from '@/page/sidebar/components/smart-folder';
import type { TreeNode } from '@/page/sidebar/store/types';

import type { UseNodeActionsReturn } from './useNodeActions';
import { type MenuItem, useNodeMenu } from './useNodeMenu';

let node: TreeNode | undefined;

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/assets/icons/RssFolderDefaultIcon', () => ({
  RssFolderDefaultIcon: () => null,
}));

jest.mock('@/page/sidebar/components/smart-folder', () => ({
  isSmartFolderChildResource: jest.fn(),
}));

jest.mock('@/page/sidebar/rssFolderQuota', () => ({
  getRssFolderQuotaTooltipKey: () => undefined,
}));

jest.mock('./useRssFolderQuotaExhausted', () => ({
  useRssFolderQuotaExhausted: () => ({}),
}));

jest.mock('@/page/sidebar/store', () => ({
  useSidebarStore: (
    selector: (state: Record<string, unknown>) => unknown
  ): unknown =>
    selector({
      namespaceId: 'namespace',
      nodes: node ? { [node.id]: node } : {},
      rootIds: { private: 'private' },
      selectedIds: [],
      selectionMode: false,
    }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const rssFolder: TreeNode = {
  id: 'rss-folder',
  parentId: 'private',
  spaceType: 'private',
  name: 'Feed',
  resourceType: 'rss_folder',
  hasChildren: true,
  createdAt: '',
  updatedAt: '',
  children: [],
};

const handleAddAllToChat = jest.fn();
const handleAddToChat = jest.fn();

const actions = {
  get node() {
    return node;
  },
  handleAddAllToChat,
  handleAddToChat,
} as unknown as UseNodeActionsReturn;

describe('useNodeMenu', () => {
  let container: HTMLDivElement;
  let root: Root;
  let items: MenuItem[];

  function Probe() {
    items = useNodeMenu(actions).items;
    return null;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    node = { ...rssFolder };
    jest.mocked(isSmartFolderChildResource).mockReturnValue(false);
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  it('offers an rss folder as chat context, all articles at once', async () => {
    await act(async () => root.render(<Probe />));

    const keys = items.map(item => item.key);
    expect(keys).toContain('add_all_to_context');
    // A feed folder is a container: attaching it one resource at a time is
    // not a thing the composer supports.
    expect(keys).not.toContain('add_it_to_context');

    const addAll = items.find(item => item.key === 'add_all_to_context');
    (addAll as { onClick?: () => void }).onClick?.();
    expect(handleAddAllToChat).toHaveBeenCalled();
  });

  it('keeps the rss folder actions that were already there', async () => {
    await act(async () => root.render(<Probe />));

    expect(items.map(item => item.key)).toEqual([
      'rename',
      'edit',
      'move_to',
      'separator_1',
      'add_all_to_context',
      'separator_2',
      'delete',
    ]);
  });
});
