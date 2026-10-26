/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { SidebarProvider, useSidebar } from '@/components/ui/Sidebar';
import { useSidebarStore } from '@/page/sidebar/store';
import type { SidebarStore, TreeNode } from '@/page/sidebar/store/types';

import { ResourceNodeContent } from './ResourceNodeContent';

const mockNavigate = jest.fn();
const mockStartRename = jest.fn();
const mockFire = jest.fn();
let mockIsMobile = false;

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/ns/current', state: null }),
  useParams: () => ({ namespace_id: 'ns' }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => ({ fire: mockFire }),
}));
jest.mock('@/hooks/useMobile', () => ({
  useIsMobile: () => mockIsMobile,
}));
jest.mock('@/service/resource', () => ({}));
jest.mock('@/lib/chatBridge', () => ({}));
jest.mock('@/components/ResourceTypeIcon', () => ({
  __esModule: true,
  default: () => <span data-testid="resource-icon" />,
}));
jest.mock('../rss-folder/useRssFolderLinkNames', () => ({
  useRssItemFeedName: () => undefined,
  useRssFolderInitialSyncStatus: () => undefined,
}));
jest.mock('@/page/sidebar/hooks/useResourceNodeDnd', () => ({
  useResourceNodeDnd: () => ({ dragStyle: {} }),
}));
jest.mock('@/page/sidebar/hooks/useResourceNodeRename', () => ({
  useResourceNodeRename: () => ({ startRename: mockStartRename }),
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

// Preserve real batch reducers, subscriptions and Radix click propagation.
jest.mock('@/page/sidebar/store', () => {
  const { create } = jest.requireActual<typeof import('zustand')>('zustand');
  const { immer } = jest.requireActual<
    typeof import('zustand/middleware/immer')
  >('zustand/middleware/immer');
  const { initialState } = jest.requireActual<
    typeof import('@/page/sidebar/store/types')
  >('@/page/sidebar/store/types');
  const { buildBatchActions } = jest.requireActual<
    typeof import('@/page/sidebar/store/actions/batch')
  >('@/page/sidebar/store/actions/batch');
  const { isNodeFullySelected, isNodeDimmedBySelection } = jest.requireActual<
    typeof import('@/page/sidebar/store/utils')
  >('@/page/sidebar/store/utils');
  const store = create<SidebarStore>()(
    immer(
      (set, get) =>
        ({
          ...initialState,
          ...buildBatchActions(set, get),
          activate: (id: string) =>
            set(state => {
              state.activeId = id;
            }),
          expand: async (id: string) =>
            set(state => {
              state.ui[id] = { expanded: true, loaded: true, loading: false };
            }),
          collapse: (id: string) =>
            set(state => {
              state.ui[id] = { expanded: false, loaded: true, loading: false };
            }),
        }) as SidebarStore
    )
  );

  return {
    useSidebarStore: store,
    useSelectionState: () => ({
      selectionMode: store(state => state.selectionMode),
      selectedIds: store(state => state.selectedIds),
      lastSelectedId: store(state => state.lastSelectedId),
    }),
    useIsSelected: (id: string) => store(state => !!state.selectedIds[id]),
    useNodeIsFullySelected: (id: string) =>
      store(state => isNodeFullySelected(state.nodes, state.selectedIds, id)),
    useNodeIsDimmedBySelection: (id: string) =>
      store(state =>
        isNodeDimmedBySelection(state.nodes, state.selectedIds, id)
      ),
  };
});

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function node(id: string, overrides: Partial<TreeNode> = {}): TreeNode {
  return {
    id,
    parentId: 'private',
    spaceType: 'private',
    name: id,
    resourceType: 'doc',
    hasChildren: false,
    readOnly: false,
    createdAt: '',
    updatedAt: '',
    manualSortInitializedAt: null,
    children: [],
    ...overrides,
  };
}

function MobileSidebarState() {
  const { openMobile, setOpenMobile } = useSidebar();
  return (
    <button data-mobile-open={openMobile} onClick={() => setOpenMobile(true)}>
      Open sidebar
    </button>
  );
}

describe('resource row selection', () => {
  let container: HTMLDivElement;
  let root: Root;
  let rows: TreeNode[];

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockIsMobile = false;
    rows = [node('a'), node('b'), node('c')];
    useSidebarStore.setState({
      namespaceId: 'ns',
      nodes: {},
      ui: {},
      selectedIds: {},
      selectionMode: true,
      lastSelectedId: null,
      renamingId: null,
      activeId: 'current',
      batchDragging: false,
      rootIds: { private: 'private', teamspace: 'teamspace' },
      spaceExpanded: { private: true, teamspace: true },
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.useRealTimers();
  });

  async function renderRows() {
    const nodes = Object.fromEntries(rows.map(row => [row.id, row]));
    nodes.private = node('private', {
      parentId: null,
      resourceType: 'folder',
      hasChildren: true,
      children: rows
        .filter(row => row.parentId === 'private')
        .map(row => row.id),
    });
    useSidebarStore.setState({ nodes });
    await act(async () => {
      root.render(
        <SidebarProvider>
          <MobileSidebarState />
          <ul>
            {rows.map(row => (
              <ResourceNodeContent
                key={row.id}
                node={row}
                nodeId={row.id}
                depth={0}
                renderChildren={false}
                hasTeamspace={false}
                onBatchDelete={jest.fn()}
                onBatchMove={jest.fn()}
                onBatchCreate={jest.fn()}
                onAddToChat={jest.fn()}
              />
            ))}
          </ul>
        </SidebarProvider>
      );
    });
  }

  function row(id = 'a') {
    return container.querySelector<HTMLElement>(
      `[data-resource-row-id="${id}"]`
    )!;
  }

  function checkbox(id = 'a') {
    return row(id).querySelector<HTMLElement>('[role="checkbox"]')!;
  }

  function content(id = 'a') {
    return row(id).querySelector<HTMLElement>('[data-sidebar="menu-button"]')!;
  }

  async function click(target: Element, options: MouseEventInit = {}) {
    await act(async () => {
      target.dispatchEvent(
        new MouseEvent('click', { bubbles: true, ...options })
      );
    });
  }

  async function flushClicks() {
    await act(async () => jest.advanceTimersByTime(300));
  }

  it.each(['row', 'title', 'icon', 'content', 'checkbox'])(
    'toggles selection once from the %s without navigating',
    async target => {
      await renderRows();
      const element =
        target === 'row'
          ? row()
          : target === 'title'
            ? content().querySelector('span.flex-1')!
            : target === 'icon'
              ? row().querySelector('[data-testid="resource-icon"]')!
              : target === 'checkbox'
                ? checkbox()
                : content();
      await click(element);
      expect(checkbox().getAttribute('aria-checked')).toBe('true');
      expect(useSidebarStore.getState().selectedIds).toEqual({ a: true });
      await click(element);
      expect(checkbox().getAttribute('aria-checked')).toBe('false');
      expect(useSidebarStore.getState().selectionMode).toBe(true);
      await flushClicks();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(useSidebarStore.getState().activeId).toBe('current');
    }
  );

  it('extends the selection across the visible Shift range', async () => {
    await renderRows();
    await click(content('a'));
    await click(content('c'), { shiftKey: true });
    expect(useSidebarStore.getState().selectedIds).toEqual({
      a: true,
      b: true,
      c: true,
    });
    expect(checkbox('b').getAttribute('aria-checked')).toBe('true');
  });

  it('selects a folder from its body but expands only from its arrow', async () => {
    rows[0] = node('a', {
      resourceType: 'folder',
      hasChildren: true,
      children: ['child'],
    });
    rows.push(node('child', { parentId: 'a' }));
    await renderRows();
    await click(content());
    expect(checkbox().getAttribute('aria-checked')).toBe('true');
    expect(useSidebarStore.getState().ui.a?.expanded).not.toBe(true);
    const arrow = content().querySelector('button')!;
    await click(arrow);
    expect(useSidebarStore.getState().ui.a.expanded).toBe(true);
    expect(checkbox().getAttribute('aria-checked')).toBe('true');
    await click(content('child'));
    expect(useSidebarStore.getState().selectedIds).toEqual({});
    await flushClicks();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it.each([
    { readOnly: true },
    {
      attrs: {
        sidebar: { smart_folder_child: true, source_resource_id: 'source' },
      },
    },
  ])('does not select or navigate an unavailable row: %j', async overrides => {
    rows[0] = node('a', overrides);
    await renderRows();
    expect(checkbox()).toBeNull();
    await click(content());
    await click(row());
    await flushClicks();
    expect(useSidebarStore.getState().selectedIds).toEqual({});
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('allows selecting a read-only RSS item', async () => {
    rows[0] = node('a', { resourceType: 'rss_item', readOnly: true });
    await renderRows();
    await click(content());
    expect(checkbox().getAttribute('aria-checked')).toBe('true');
  });

  it('never navigates or renames on a double click in selection mode', async () => {
    await renderRows();
    await click(content(), { detail: 1 });
    await click(content(), { detail: 2 });
    await act(async () => {
      content().dispatchEvent(
        new MouseEvent('dblclick', { bubbles: true, detail: 2 })
      );
    });
    expect(checkbox().getAttribute('aria-checked')).toBe('false');
    await flushClicks();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockStartRename).not.toHaveBeenCalled();
  });

  it('cancels pending navigation when entering selection mode', async () => {
    useSidebarStore.setState({ selectionMode: false });
    await renderRows();
    await click(content());
    await act(async () => useSidebarStore.getState().setSelectionMode(true));
    await act(async () => useSidebarStore.getState().setSelectionMode(false));
    await flushClicks();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('guards a queued navigation before the selection render commits', async () => {
    useSidebarStore.setState({ selectionMode: false });
    await renderRows();
    await click(content());
    await act(async () => {
      useSidebarStore.getState().setSelectionMode(true);
      jest.advanceTimersByTime(300);
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('cancels pending navigation when a virtual row unmounts', async () => {
    useSidebarStore.setState({ selectionMode: false });
    await renderRows();
    await click(content());
    await act(async () => root.render(null));
    await flushClicks();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('keeps the narrow-screen sidebar open when selecting', async () => {
    mockIsMobile = true;
    await renderRows();
    await click(container.querySelector('[data-mobile-open]')!);
    await click(content());
    await flushClicks();
    expect(
      container
        .querySelector('[data-mobile-open]')
        ?.getAttribute('data-mobile-open')
    ).toBe('true');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('still opens details after exiting selection mode', async () => {
    await renderRows();
    await act(async () => useSidebarStore.getState().setSelectionMode(false));
    await click(content());
    await flushClicks();
    expect(mockNavigate).toHaveBeenCalledWith('/ns/a', expect.any(Object));
  });

  it('still renames on a double click in normal browsing mode', async () => {
    useSidebarStore.setState({ selectionMode: false });
    await renderRows();
    await click(content(), { detail: 1 });
    await click(content(), { detail: 2 });
    await act(async () => {
      content().dispatchEvent(
        new MouseEvent('dblclick', { bubbles: true, detail: 2 })
      );
    });
    await flushClicks();
    expect(mockStartRename).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('preserves Shift range selection when using a checkbox', async () => {
    await renderRows();
    await click(checkbox('a'));
    await click(checkbox('c'), { shiftKey: true });
    expect(useSidebarStore.getState().selectedIds).toEqual({
      a: true,
      b: true,
      c: true,
    });
  });
});
