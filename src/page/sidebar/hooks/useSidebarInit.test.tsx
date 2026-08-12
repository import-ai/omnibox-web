/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { useSidebarInit } from './useSidebarInit';

const navigate = jest.fn();
const mockLocation = {
  pathname: '/namespace-1/resource-1',
  state: undefined as { fromSidebar?: boolean } | undefined,
};
const mockStore = {
  activeId: null as string | null,
  activate: jest.fn(),
  expandPathTo: jest.fn().mockResolvedValue(undefined),
  init: jest.fn(),
  nodes: {},
  resourceSorts: { private: undefined, teamspace: undefined },
  rootIds: { private: 'private-root', teamspace: '' },
  setNamespaceId: jest.fn(),
};

jest.mock('react-router-dom', () => ({
  useLocation: () => mockLocation,
  useNavigate: () => navigate,
}));
jest.mock('@/page/sidebar/store', () => ({
  useSidebarStore: Object.assign(
    (selector: (state: typeof mockStore) => unknown) => selector(mockStore),
    { getState: () => mockStore }
  ),
}));
jest.mock('@/service/resource', () => ({
  fetchRootResources: jest.fn(),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function Harness() {
  useSidebarInit({ namespaceId: 'namespace-1', resourceId: 'resource-1' });
  return null;
}

describe('useSidebarInit', () => {
  let container: HTMLDivElement;
  let root: Root;
  let resourceElement: HTMLDivElement;
  let scrollIntoView: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockLocation.state = undefined;
    mockStore.activeId = null;
    mockStore.expandPathTo.mockResolvedValue(undefined);

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
      root.render(<Harness />);
    });

    expect(mockStore.expandPathTo).toHaveBeenCalledWith('resource-1', {
      expandTarget: true,
    });
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'center',
    });
  });

  it('keeps the current scroll position for sidebar navigation', async () => {
    mockLocation.state = { fromSidebar: true };

    await act(async () => {
      root.render(<Harness />);
    });

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/namespace-1/resource-1', {
      replace: true,
      state: { fromSidebar: undefined },
    });
  });
});
