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
const CONFIG_URL = `/namespaces/${NAMESPACE_ID}/rss-folders/${FOLDER_ID}/config`;
const FEED_A = 'link-a';
const FEED_B = 'link-b';

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
    dropPosition: null,
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
jest.mock('@/page/sidebar/store', () => ({
  useSidebarStore: Object.assign(() => undefined, { getState: () => ({}) }),
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

function mockConfig(links: Array<{ id: string; name: string }>) {
  mockGet.mockImplementation((url: string) =>
    url === CONFIG_URL
      ? Promise.resolve({
          resource: { id: FOLDER_ID, name: 'Feeds' },
          links: links.map((link, index) => ({
            ...link,
            index,
            url: `https://example.com/${link.id}`,
          })),
        })
      : Promise.reject(new Error(`unexpected request: ${url}`))
  );
}

describe('ResourceNodeContent rss item rows', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    clearRssFolderLinkNamesCache();
    mockGet.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
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
});
