/** @jest-environment jsdom */

import { insertUnspecifiedChild } from './store/utils';
import {
  clearSidebarActiveKeyFromState,
  locateSidebarResource,
  locateSidebarRssItem,
} from './utils';

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

  it('skips activate and scroll when the locate is aborted', async () => {
    const frames: FrameRequestCallback[] = [];
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      frames.push(callback);
      return frames.length;
    });
    let resolveExpand: (() => void) | undefined;
    mockExpandPathTo.mockImplementation(
      () =>
        new Promise<void>(resolve => {
          resolveExpand = resolve;
        })
    );
    mockToggleSpace.mockClear();
    mockActivate.mockClear();

    const controller = new AbortController();
    const locating = locateSidebarResource('target', {
      signal: controller.signal,
    });
    controller.abort();
    resolveExpand?.();
    await locating;

    expect(mockToggleSpace).not.toHaveBeenCalled();
    expect(mockActivate).not.toHaveBeenCalled();
    expect(frames).toHaveLength(0);
  });
});

describe('locateSidebarRssItem', () => {
  afterEach(() => {
    document.body.replaceChildren();
    jest.restoreAllMocks();
    jest.clearAllMocks();
    mockSidebarState.nodes = {
      target: { spaceType: 'private' },
    };
  });

  it('waits for the rss item row and scrolls the sidebar container', async () => {
    const frames: FrameRequestCallback[] = [];
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      frames.push(callback);
      return frames.length;
    });
    mockExpandPathTo.mockResolvedValue(undefined);
    mockSidebarState.nodes = {
      folder: { spaceType: 'private' },
    };

    const container = document.createElement('div');
    container.dataset.sidebar = 'content';
    Object.defineProperty(container, 'clientHeight', { value: 100 });
    container.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
    const target = document.createElement('div');
    target.dataset.rssItemId = 'item-1';
    target.getBoundingClientRect = () => ({ top: 240, height: 20 }) as DOMRect;
    container.appendChild(target);
    document.body.appendChild(container);

    await flushLocate(locateSidebarRssItem('folder', 'item-1'), frames);

    expect(mockExpandPathTo).toHaveBeenCalledWith('folder', {
      expandTarget: true,
    });
    expect(mockToggleSpace).toHaveBeenCalledWith('private', true);
    expect(mockActivate).toHaveBeenCalledWith('folder');
    expect(container.scrollTop).toBe(200);
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
