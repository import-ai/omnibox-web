/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { fetchRootResources } from '@/service/resource';

import { useSidebarInit } from './useSidebarInit';

const navigate = jest.fn();
const activate = jest.fn((id: string | null) => {
  mockSidebarState.activeId = id;
});
const expandPathTo = jest.fn().mockResolvedValue(undefined);
const locateSidebarResource = jest.fn(() => Promise.resolve(undefined));
const setNamespaceId = jest.fn();
const init = jest.fn();
const mockSidebarState = {
  activeId: null as string | null,
  activate,
  expandPathTo,
  init,
  nodes: {},
  resourceSorts: { private: {}, teamspace: {} },
  rootIds: { private: 'private-root', teamspace: '' },
  setNamespaceId,
};
let location = {
  pathname: '/namespace/chat/conversation',
  state: null as Record<string, unknown> | null,
};

jest.mock('react-router-dom', () => ({
  useLocation: () => location,
  useNavigate: () => navigate,
}));

jest.mock('@/page/resource/resourceNavigation', () => ({
  navigateToResource: jest.fn(),
}));

jest.mock('@/page/sidebar/components/smart-folder', () => ({
  getSmartFolderParentIdFromChildKey: jest.fn(),
}));

jest.mock('@/page/sidebar/store', () => ({
  useSidebarStore: Object.assign(
    (selector: (state: typeof mockSidebarState) => unknown) =>
      selector(mockSidebarState),
    { getState: () => mockSidebarState }
  ),
}));

jest.mock('@/page/sidebar/utils', () => ({
  locateSidebarResource: (...args: unknown[]) => locateSidebarResource(...args),
  clearSidebarActiveKeyFromState: (state: Record<string, unknown> | null) => {
    if (!state || !('sidebarActiveKey' in state)) {
      return { changed: false, nextState: state };
    }
    const nextState = { ...state };
    delete nextState.sidebarActiveKey;
    return {
      changed: true,
      nextState: Object.keys(nextState).length > 0 ? nextState : null,
    };
  },
}));

jest.mock('@/service/resource', () => ({
  fetchRootResources: jest.fn(),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function Probe({
  previewResourceId = null,
  resourceId = '',
  namespaceId = 'namespace',
}: {
  previewResourceId?: string | null;
  resourceId?: string;
  namespaceId?: string;
}) {
  useSidebarInit({
    namespaceId,
    previewResourceId,
    resourceId,
  });
  return null;
}

describe('useSidebarInit Copilot resource sync', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockSidebarState.activeId = null;
    location = {
      pathname: '/namespace/chat/conversation',
      state: null,
    };
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0);
      return 1;
    });
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    jest.restoreAllMocks();
  });

  it('loads both workspace roots with one request', async () => {
    const roots = {
      private: { id: 'private-root' },
      teamspace: { id: 'teamspace-root' },
    };
    localStorage.setItem('uid', 'user-1');
    jest.mocked(fetchRootResources).mockResolvedValue(roots as never);

    await act(async () => {
      root.render(<Probe />);
      await Promise.resolve();
    });

    expect(fetchRootResources).toHaveBeenCalledTimes(1);
    expect(fetchRootResources).toHaveBeenCalledWith(
      'namespace',
      { signal: expect.any(AbortSignal) },
      mockSidebarState.resourceSorts
    );
    expect(init).toHaveBeenCalledWith(roots);
  });

  it('locates and activates a Copilot preview from a chat route', async () => {
    location.state = { sidebarActiveKey: 'old-smart-folder-row' };

    await act(async () => {
      root.render(<Probe previewResourceId="preview-resource" />);
      await Promise.resolve();
    });

    expect(locateSidebarResource).toHaveBeenCalledWith(
      'preview-resource',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        shouldApply: expect.any(Function),
      })
    );
    expect(activate).toHaveBeenCalledWith('preview-resource');
    expect(navigate).toHaveBeenCalledWith(location.pathname, {
      replace: true,
      state: null,
    });
  });

  it('follows Copilot preview changes and clears selection when it closes', async () => {
    await act(async () => {
      root.render(<Probe previewResourceId="first-resource" />);
      await Promise.resolve();
    });
    await act(async () => {
      root.render(<Probe previewResourceId="second-resource" />);
      await Promise.resolve();
    });

    expect(locateSidebarResource).toHaveBeenLastCalledWith(
      'second-resource',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        shouldApply: expect.any(Function),
      })
    );
    expect(activate).toHaveBeenLastCalledWith('second-resource');

    await act(async () => {
      root.render(<Probe previewResourceId={null} />);
    });

    expect(activate).toHaveBeenLastCalledWith(null);
  });

  it('restores the route resource after a Copilot preview closes', async () => {
    location = { pathname: '/namespace/route-resource', state: null };

    await act(async () => {
      root.render(
        <Probe
          previewResourceId="preview-resource"
          resourceId="route-resource"
        />
      );
      await Promise.resolve();
    });
    await act(async () => {
      root.render(
        <Probe previewResourceId={null} resourceId="route-resource" />
      );
      await Promise.resolve();
    });

    expect(expandPathTo).toHaveBeenLastCalledWith('route-resource', {
      expandTarget: true,
    });
    expect(activate).toHaveBeenLastCalledWith('route-resource');
  });

  it('aborts a stale Copilot preview locate when the preview changes', async () => {
    const deferred: Array<{
      resourceId: string;
      options?: { signal?: AbortSignal; shouldApply?: () => boolean };
      resolve: () => void;
    }> = [];
    locateSidebarResource.mockImplementation(
      (
        resourceId: string,
        options?: { signal?: AbortSignal; shouldApply?: () => boolean }
      ) =>
        new Promise<void>(resolve => {
          deferred.push({ resourceId, options, resolve });
        })
    );

    await act(async () => {
      root.render(<Probe previewResourceId="first-resource" />);
      await Promise.resolve();
    });
    await act(async () => {
      root.render(<Probe previewResourceId="second-resource" />);
      await Promise.resolve();
    });

    expect(deferred).toHaveLength(2);
    expect(deferred[0].options?.signal?.aborted).toBe(true);
    expect(deferred[0].options?.shouldApply?.()).toBe(false);
    expect(deferred[1].options?.signal?.aborted).toBe(false);
    expect(deferred[1].options?.shouldApply?.()).toBe(true);

    await act(async () => {
      deferred[0].resolve();
      deferred[1].resolve();
      await Promise.resolve();
    });

    expect(activate).toHaveBeenLastCalledWith('second-resource');
  });

  it('aborts a stale Copilot preview locate when the preview closes', async () => {
    let resolveLocate: (() => void) | undefined;
    let locateOptions:
      { signal?: AbortSignal; shouldApply?: () => boolean } | undefined;
    locateSidebarResource.mockImplementation(
      (
        _resourceId: string,
        options?: { signal?: AbortSignal; shouldApply?: () => boolean }
      ) =>
        new Promise<void>(resolve => {
          locateOptions = options;
          resolveLocate = resolve;
        })
    );

    await act(async () => {
      root.render(<Probe previewResourceId="preview-resource" />);
      await Promise.resolve();
    });
    await act(async () => {
      root.render(<Probe previewResourceId={null} />);
    });

    expect(locateOptions?.signal?.aborted).toBe(true);
    expect(locateOptions?.shouldApply?.()).toBe(false);

    await act(async () => {
      resolveLocate?.();
      await Promise.resolve();
    });

    expect(activate).toHaveBeenLastCalledWith(null);
  });
});

describe('useSidebarInit direct open scroll', () => {
  let container: HTMLDivElement;
  let root: Root;
  let resourceElement: HTMLDivElement;
  let scrollIntoView: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockSidebarState.activeId = null;
    location = {
      pathname: '/namespace-1/resource-1',
      state: null,
    };
    container = document.createElement('div');
    document.body.appendChild(container);
    resourceElement = document.createElement('div');
    resourceElement.dataset.resourceId = 'resource-1';
    document.body.appendChild(resourceElement);
    root = createRoot(container);
    scrollIntoView = jest.fn();
    Object.defineProperty(resourceElement, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0);
      return 1;
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    resourceElement.remove();
    jest.restoreAllMocks();
  });

  it('positions a directly opened resource without smooth scrolling', async () => {
    await act(async () => {
      root.render(
        <Probe
          namespaceId="namespace-1"
          previewResourceId={null}
          resourceId="resource-1"
        />
      );
    });

    expect(expandPathTo).toHaveBeenCalledWith('resource-1', {
      expandTarget: true,
    });
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'center',
    });
  });

  it('keeps the current scroll position for sidebar navigation', async () => {
    location = {
      pathname: '/namespace-1/resource-1',
      state: { fromSidebar: true },
    };

    await act(async () => {
      root.render(
        <Probe
          namespaceId="namespace-1"
          previewResourceId={null}
          resourceId="resource-1"
        />
      );
    });

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/namespace-1/resource-1', {
      replace: true,
      state: { fromSidebar: undefined },
    });
  });
});
