/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { useSidebarInit } from './useSidebarInit';

const navigate = jest.fn();
const activate = jest.fn((id: string | null) => {
  mockSidebarState.activeId = id;
});
const expandPathTo = jest.fn().mockResolvedValue(undefined);
const locateSidebarResource = jest.fn().mockResolvedValue(undefined);
const setNamespaceId = jest.fn();
const mockSidebarState = {
  activeId: null as string | null,
  activate,
  expandPathTo,
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
  previewResourceId,
  resourceId = '',
}: {
  previewResourceId: string | null;
  resourceId?: string;
}) {
  useSidebarInit({
    namespaceId: 'namespace',
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

  it('locates and activates a Copilot preview from a chat route', async () => {
    location.state = { sidebarActiveKey: 'old-smart-folder-row' };

    await act(async () => {
      root.render(<Probe previewResourceId="preview-resource" />);
      await Promise.resolve();
    });

    expect(locateSidebarResource).toHaveBeenCalledWith('preview-resource');
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

    expect(locateSidebarResource).toHaveBeenLastCalledWith('second-resource');
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
});
