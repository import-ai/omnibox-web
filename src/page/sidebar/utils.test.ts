/** @jest-environment jsdom */

import type { Resource } from '@/interface';
import { RSS_ITEM_SORT } from '@/service/resourceSort';

import type { TreeNode } from './store/types';
import {
  createNode,
  getNodeResourceSort,
  insertUnspecifiedChild,
  isBatchSelectableNode,
  isManagedChildrenNode,
} from './store/utils';
import { clearSidebarActiveKeyFromState, locateSidebarResource } from './utils';

const mockExpandPathTo = jest.fn();
const mockToggleSpace = jest.fn();
const mockActivate = jest.fn();
const mockSidebarState = {
  expandPathTo: mockExpandPathTo,
  toggleSpace: mockToggleSpace,
  activate: mockActivate,
  nodes: {
    target: { spaceType: 'private' },
  },
};

jest.mock('@/const', () => ({ ALLOW_FILE_EXTENSIONS: '' }));

jest.mock('@/lib/openFilePicker', () => ({
  openFilePicker: jest.fn(),
}));

jest.mock('@/page/sidebar/components/smart-folder', () => ({
  isSmartFolderChildResource: jest.fn(),
}));

jest.mock('./store', () => ({
  useSidebarStore: {
    getState: () => mockSidebarState,
  },
}));

async function flushLocate(
  locating: Promise<void>,
  frames: FrameRequestCallback[]
) {
  // expandPathTo resolves first; centerSidebarElement schedules rAF after that.
  await Promise.resolve();
  await Promise.resolve();
  frames.shift()?.(0);
  frames.shift()?.(16);
  await locating;
}

describe('locateSidebarResource', () => {
  afterEach(() => {
    document.body.replaceChildren();
    jest.restoreAllMocks();
    jest.clearAllMocks();
    mockSidebarState.nodes = {
      target: { spaceType: 'private' },
    };
  });

  it('waits for a stable position and scrolls the sidebar container', async () => {
    const frames: FrameRequestCallback[] = [];
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      frames.push(callback);
      return frames.length;
    });
    mockExpandPathTo.mockResolvedValue(undefined);

    const container = document.createElement('div');
    container.dataset.sidebar = 'content';
    Object.defineProperty(container, 'clientHeight', { value: 100 });
    container.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
    const target = document.createElement('div');
    target.dataset.resourceId = 'target';
    target.getBoundingClientRect = () => ({ top: 200, height: 20 }) as DOMRect;
    container.appendChild(target);
    document.body.appendChild(container);

    await flushLocate(locateSidebarResource('target'), frames);

    expect(mockToggleSpace).toHaveBeenCalledWith('private', true);
    expect(mockActivate).toHaveBeenCalledWith('target');
    expect(container.scrollTop).toBe(160);
  });
});

describe('clearSidebarActiveKeyFromState', () => {
  it('removes sidebarActiveKey and keeps other state fields', () => {
    expect(
      clearSidebarActiveKeyFromState({
        fromSidebar: true,
        sidebarActiveKey: 'smart-folder-child-sf-source',
      })
    ).toEqual({
      changed: true,
      nextState: { fromSidebar: true },
    });
  });

  it('returns null when sidebarActiveKey was the only field', () => {
    expect(
      clearSidebarActiveKeyFromState({
        sidebarActiveKey: 'smart-folder-child-sf-source',
      })
    ).toEqual({ changed: true, nextState: null });
  });

  it('is a no-op without sidebarActiveKey', () => {
    expect(clearSidebarActiveKeyFromState({ fromSidebar: true })).toEqual({
      changed: false,
      nextState: { fromSidebar: true },
    });
    expect(clearSidebarActiveKeyFromState(null)).toEqual({
      changed: false,
      nextState: null,
    });
  });
});

describe('insertUnspecifiedChild', () => {
  it('appends in manual sort and prepends before automatic refresh', () => {
    expect(
      insertUnspecifiedChild(['first', 'second'], 'created', true)
    ).toEqual(['first', 'second', 'created']);
    expect(
      insertUnspecifiedChild(['first', 'second'], 'created', false)
    ).toEqual(['created', 'first', 'second']);
  });
});

describe('rss item nodes', () => {
  const rssItem = {
    id: 'item-1',
    name: 'Article',
    parent_id: 'rss-folder',
    resource_type: 'rss_item',
    space_type: 'private',
    has_children: false,
    read_only: true,
  } as unknown as Resource;

  it('marks rss items read-only and keeps them out of batch selection', () => {
    const node = createNode(rssItem, 'rss-folder', 'private');

    expect(node.readOnly).toBe(true);
    expect(node.hasChildren).toBe(false);
    expect(isBatchSelectableNode(node)).toBe(false);
  });

  it('keeps ordinary resources selectable', () => {
    const node = createNode(
      { ...rssItem, resource_type: 'doc', read_only: false } as Resource,
      'folder',
      'private'
    );

    expect(node.readOnly).toBe(false);
    expect(isBatchSelectableNode(node)).toBe(true);
  });

  it('reports rss folders as managed and expandable only from real children', () => {
    const folder = createNode(
      {
        ...rssItem,
        id: 'rss-folder',
        resource_type: 'rss_folder',
        has_children: true,
        read_only: false,
      } as Resource,
      'root',
      'private'
    );

    expect(folder.hasChildren).toBe(true);
    expect(isManagedChildrenNode(folder)).toBe(true);
  });

  it('sorts rss folder children newest-published first', () => {
    const nodes: Record<string, TreeNode> = {
      'rss-folder': createNode(
        {
          ...rssItem,
          id: 'rss-folder',
          resource_type: 'rss_folder',
          has_children: true,
        } as Resource,
        'root',
        'private'
      ),
      folder: createNode(
        { ...rssItem, id: 'folder', resource_type: 'folder' } as Resource,
        'root',
        'private'
      ),
    };
    const spaceSort = { sort_by: 'title', sort_order: 'asc' } as const;
    const state = {
      nodes,
      resourceSorts: { private: spaceSort, teamspace: spaceSort },
    };

    expect(getNodeResourceSort(state, 'rss-folder')).toEqual(RSS_ITEM_SORT);
    expect(getNodeResourceSort(state, 'folder')).toEqual(spaceSort);
  });
});
