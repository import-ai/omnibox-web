/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { http } from '@/lib/request';
import type { TreeNode } from '@/page/sidebar/store';

import { clearRssFolderLinkNamesCache } from '../rss-folder/useRssFolderLinkNames';
import { ResourceNodeContent } from './ResourceNodeContent';

const NAMESPACE_ID = 'ns-1';
const FOLDER_ID = 'rss-folder-1';
const SMART_FOLDER_ID = 'smart-folder-1';
const CONFIG_URL = `/namespaces/${NAMESPACE_ID}/rss-folders/${FOLDER_ID}/config`;
const FEED_A = 'link-a';
const FEED_B = 'link-b';
const mockFire = jest.fn();
const mockCollapse = jest.fn();
const mockExpand = jest.fn();
let mockIsInsideDrop = false;

jest.mock('@/lib/request', () => ({
  http: { get: jest.fn() },
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/', state: null }),
  useParams: () => ({ namespace_id: 'ns-1' }),
}));
jest.mock('@/hooks/useMobile', () => ({
  useIsMobile: () => false,
}));
jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => ({ fire: mockFire }),
}));
jest.mock('@/components/Checkbox', () => ({
  Checkbox: () => null,
}));
jest.mock('@/components/ResourceTypeIcon', () => ({
  __esModule: true,
  default: () => <span data-testid="resource-icon" />,
}));
// Sidebar chrome the row is wrapped in; none of it affects which icon renders.
jest.mock('@/components/ui/Sidebar', () => ({
  SidebarMenuButton: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => (
    <li>{children}</li>
  ),
  SidebarMenuSub: ({ children }: { children: React.ReactNode }) => (
    <ul>{children}</ul>
  ),
  useSidebar: () => ({ setOpenMobile: jest.fn() }),
}));
jest.mock('@/components/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipContent: () => null,
}));
jest.mock('@/components/ui/Collapsible', () => ({
  Collapsible: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));
jest.mock('./NodeActions', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('./NodeContextMenu', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('./ResourceNode', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/page/sidebar/hooks/useResourceNodeDnd', () => ({
  useResourceNodeDnd: () => ({
    dragRef: undefined,
    dropRef: undefined,
    dragStyle: {},
    isDisabledOver: false,
    isFileDragOver: false,
    isInsideDrop: mockIsInsideDrop,
  }),
}));
jest.mock('@/page/sidebar/hooks/useResourceNodeRename', () => ({
  useResourceNodeRename: () => ({
    editName: '',
    handleBlur: jest.fn(),
    handleKeyDown: jest.fn(),
    inputRef: { current: null },
    setEditName: jest.fn(),
    startRename: jest.fn(),
  }),
}));
// A row reads its parent out of the tree to know what kind of folder it sits
// in, so the store has to hold the parent node the row claims.
const mockSidebarState: {
  activeId: string | null;
  dialogs: { upload: Record<string, string> };
  nodes: Record<string, { id: string; resourceType: string }>;
  renamingId: string | null;
  ui: Record<string, unknown>;
  collapse: jest.Mock;
  expand: jest.Mock;
} = {
  activeId: null,
  dialogs: { upload: {} },
  nodes: {},
  renamingId: null,
  ui: {},
  collapse: mockCollapse,
  expand: mockExpand,
};

jest.mock('@/page/sidebar/store', () => ({
  useSidebarStore: Object.assign(
    (selector: (state: typeof mockSidebarState) => unknown) =>
      selector(mockSidebarState),
    { getState: () => mockSidebarState }
  ),
  useSelectionState: () => ({
    selectionMode: false,
    lastSelectedId: null,
    selectedIds: {},
  }),
  useIsSelected: () => false,
  useNodeIsFullySelected: () => false,
  useNodeIsDimmedBySelection: () => false,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mockGet = http.get as jest.Mock;

function itemNode(id: string, attrs: Record<string, unknown>): TreeNode {
  return {
    id,
    parentId: FOLDER_ID,
    spaceType: 'private',
    name: 'An article',
    resourceType: 'rss_item',
    attrs,
    hasChildren: false,
    readOnly: true,
    createdAt: '2026-05-04T09:08:07.000Z',
    updatedAt: '2026-05-04T09:08:07.000Z',
    manualSortInitializedAt: null,
    children: [],
  } as unknown as TreeNode;
}

function mockConfig(
  links: Array<{ id: string; name: string }>,
  initialSyncStatus = 'failed'
) {
  mockGet.mockImplementation((url: string) =>
    url === CONFIG_URL
      ? Promise.resolve({
          resource: { id: FOLDER_ID, name: 'Feeds' },
          links: links.map((link, index) => ({
            ...link,
            index,
            url: `https://example.com/${link.id}`,
          })),
          initial_sync_status: initialSyncStatus,
        })
      : Promise.reject(new Error(`unexpected request: ${url}`))
  );
}

describe('ResourceNodeContent', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    clearRssFolderLinkNamesCache();
    mockGet.mockReset();
    mockFire.mockReset();
    mockCollapse.mockReset();
    mockExpand.mockReset();
    mockIsInsideDrop = false;
    mockSidebarState.nodes = {
      [FOLDER_ID]: { id: FOLDER_ID, resourceType: 'rss_folder' },
      [SMART_FOLDER_ID]: { id: SMART_FOLDER_ID, resourceType: 'smart_folder' },
    };
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.useRealTimers();
  });

  async function renderNodes(nodes: TreeNode[]) {
    await act(async () => {
      root.render(
        <>
          {nodes.map(node => (
            <ResourceNodeContent
              key={node.id}
              node={node}
              nodeId={node.id}
              depth={1}
              hasTeamspace={false}
              onBatchDelete={jest.fn()}
              onBatchMove={jest.fn()}
              onBatchCreate={jest.fn()}
              onAddToChat={jest.fn()}
            />
          ))}
        </>
      );
    });
  }

  describe('drag target styling', () => {
    it('outlines a resource when the drag target is inside it', async () => {
      mockIsInsideDrop = true;
      mockConfig([]);

      await renderNodes([itemNode('item-a', {})]);

      const dropTarget = container.querySelector(
        '[data-resource-drop-id="item-a"]'
      );
      expect(dropTarget?.classList.contains('ring-2')).toBe(true);
      expect(dropTarget?.classList.contains('ring-inset')).toBe(true);
      expect(dropTarget?.classList.contains('ring-blue-500')).toBe(true);
    });
  });

  function badges() {
    return Array.from(
      container.querySelectorAll('[data-testid="rss-feed-badge"]')
    ).map(node => node.textContent);
  }

  function icons() {
    return container.querySelectorAll('[data-testid="resource-icon"]');
  }

  it('shows the feed initial instead of the resource icon', async () => {
    mockConfig([{ id: FEED_A, name: 'hacker news' }]);

    await renderNodes([itemNode('item-1', { link_id: FEED_A })]);

    expect(badges()).toEqual(['H']);
    expect(icons()).toHaveLength(0);
  });

  it('gives items of two feeds in one folder different initials', async () => {
    mockConfig([
      { id: FEED_A, name: 'Alpha Weekly' },
      { id: FEED_B, name: 'beta digest' },
    ]);

    await renderNodes([
      itemNode('item-1', { link_id: FEED_A }),
      itemNode('item-2', { link_id: FEED_B }),
    ]);

    expect(badges()).toEqual(['A', 'B']);
  });

  it.each([
    ['a retired link', { link_id: 'gone' }, [{ id: FEED_A, name: 'Alpha' }]],
    ['no link id', {}, [{ id: FEED_A, name: 'Alpha' }]],
    ['an unnamed feed', { link_id: FEED_A }, [{ id: FEED_A, name: '' }]],
  ])('falls back to the resource icon for %s', async (_label, attrs, links) => {
    mockConfig(links);

    await renderNodes([itemNode('item-1', attrs)]);

    expect(badges()).toEqual([]);
    expect(icons()).toHaveLength(1);
  });

  it('reads the folder config once however many item rows there are', async () => {
    mockConfig([{ id: FEED_A, name: 'Alpha Weekly' }]);

    await renderNodes(
      Array.from({ length: 20 }, (_, index) =>
        itemNode(`item-${index}`, { link_id: FEED_A })
      )
    );

    expect(badges()).toHaveLength(20);
    expect(
      mockGet.mock.calls.filter(([url]) => url === CONFIG_URL)
    ).toHaveLength(1);
  });

  it('leaves a non-rss node with its resource icon and asks for no config', async () => {
    mockConfig([{ id: FEED_A, name: 'Alpha Weekly' }]);
    const node = {
      ...itemNode('doc-1', {}),
      resourceType: 'doc',
      readOnly: false,
    } as TreeNode;

    await renderNodes([node]);

    expect(badges()).toEqual([]);
    expect(icons()).toHaveLength(1);
    expect(mockGet).not.toHaveBeenCalled();
  });

  // A smart folder that collects rss items re-parents them to itself, so the
  // row's parent is not the feed folder. There is no feed config to read there:
  // asking for one 404s, and the miss is memoised for the session.
  it('asks for no config for an item a smart folder collected', async () => {
    mockConfig([{ id: FEED_A, name: 'Alpha Weekly' }]);
    const collected = {
      ...itemNode('item-1', { link_id: FEED_A }),
      parentId: SMART_FOLDER_ID,
    } as TreeNode;

    await renderNodes([collected]);

    expect(mockGet).not.toHaveBeenCalled();
    // Still a usable row: it falls back to the resource icon.
    expect(badges()).toEqual([]);
    expect(icons()).toHaveLength(1);
  });

  // ...and the miss must not have poisoned the folder that does have a config.
  it('still badges the same item under its own rss folder', async () => {
    mockConfig([{ id: FEED_A, name: 'Alpha Weekly' }]);

    await renderNodes([
      {
        ...itemNode('collected-1', { link_id: FEED_A }),
        parentId: SMART_FOLDER_ID,
      } as TreeNode,
      itemNode('item-1', { link_id: FEED_A }),
    ]);

    expect(badges()).toEqual(['A']);
    expect(
      mockGet.mock.calls.filter(([url]) => url === CONFIG_URL)
    ).toHaveLength(1);
    expect(
      mockGet.mock.calls.filter(([url]: [string]) =>
        url.includes(SMART_FOLDER_ID)
      )
    ).toHaveLength(0);
  });
});

describe('ResourceNodeContent empty folders', () => {
  let container: HTMLDivElement;
  let root: Root;

  function folderNode(
    id: string,
    resourceType: TreeNode['resourceType']
  ): TreeNode {
    return {
      id,
      parentId: null,
      spaceType: 'private',
      name: id,
      resourceType,
      hasChildren: false,
      readOnly: false,
      createdAt: '',
      updatedAt: '',
      manualSortInitializedAt: null,
      children: [],
    } as unknown as TreeNode;
  }

  beforeEach(() => {
    clearRssFolderLinkNamesCache();
    mockGet.mockReset();
    mockFire.mockReset();
    mockGet.mockResolvedValue({
      resource: {},
      links: [],
      initial_sync_status: 'succeeded',
    });
    mockSidebarState.nodes = {};
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  async function renderExpanded(node: TreeNode) {
    mockSidebarState.ui = {
      [node.id]: { expanded: true, loaded: true, loading: false },
    };
    await act(async () => {
      root.render(
        <ResourceNodeContent
          node={node}
          nodeId={node.id}
          depth={0}
          hasTeamspace={false}
          onBatchDelete={jest.fn()}
          onBatchMove={jest.fn()}
          onBatchCreate={jest.fn()}
          onAddToChat={jest.fn()}
        />
      );
    });
  }

  it.each(['rss_folder', 'smart_folder'] as const)(
    'tells the user a %s the backend fills is empty',
    async resourceType => {
      await renderExpanded(folderNode('empty', resourceType));

      expect(container.textContent).toContain('sidebar.folder_empty');
    }
  );

  it('stays silent for an empty plain folder', async () => {
    await renderExpanded(folderNode('plain', 'folder'));

    expect(container.textContent).not.toContain('sidebar.folder_empty');
  });

  it('shows loading instead of empty while an rss folder is syncing', async () => {
    mockGet.mockResolvedValue({
      resource: {},
      links: [],
      initial_sync_status: 'pending',
    });

    await renderExpanded(folderNode(FOLDER_ID, 'rss_folder'));

    expect(container.textContent).toContain('rss_folder.loading');
    expect(container.textContent).not.toContain('sidebar.folder_empty');
  });

  it.each([
    ['pending', 'rss_folder.loading'],
    ['failed', 'rss_folder.load_failed'],
  ])(
    'shows %s sync status while the rss folder already has children',
    async (status, message) => {
      mockGet.mockResolvedValue({
        resource: {},
        links: [],
        initial_sync_status: status,
      });
      const node = folderNode(FOLDER_ID, 'rss_folder');
      node.hasChildren = true;
      node.children = ['item-1'];

      await renderExpanded(node);

      expect(container.textContent).toContain(message);
    }
  );

  it('refreshes children when a failed rss sync later succeeds', async () => {
    jest.useFakeTimers();
    mockGet
      .mockResolvedValueOnce({
        resource: {},
        links: [],
        initial_sync_status: 'failed',
      })
      .mockResolvedValueOnce({
        resource: {},
        links: [],
        initial_sync_status: 'succeeded',
      });

    await renderExpanded(folderNode(FOLDER_ID, 'rss_folder'));
    expect(mockFire).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(30_000);
      await Promise.resolve();
    });

    expect(mockFire).toHaveBeenCalledWith(
      'refresh_resource_children',
      FOLDER_ID
    );
  });

  it('allows a loading folder to be collapsed', async () => {
    const node = folderNode(FOLDER_ID, 'rss_folder');
    node.hasChildren = true;
    mockSidebarState.ui = {
      [node.id]: { expanded: true, loaded: false, loading: true },
    };

    await act(async () => {
      root.render(
        <ResourceNodeContent
          node={node}
          nodeId={node.id}
          depth={0}
          hasTeamspace={false}
          onBatchDelete={jest.fn()}
          onBatchMove={jest.fn()}
          onBatchCreate={jest.fn()}
          onAddToChat={jest.fn()}
        />
      );
    });

    const loadingButton = container.querySelector('button');
    await act(async () => {
      loadingButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(mockCollapse).toHaveBeenCalledWith(FOLDER_ID);
    expect(mockExpand).not.toHaveBeenCalled();
  });
});
