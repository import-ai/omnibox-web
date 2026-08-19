/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { useSidebarInit } from './useSidebarInit';

const init = jest.fn();
const setNamespaceId = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/s/share-1/chat', state: null }),
}));

jest.mock('@/page/share/sidebar/store', () => ({
  useSidebarStore: Object.assign(
    (selector: (state: unknown) => unknown) =>
      selector({ rootIds: { share: '' } }),
    {
      getState: () => ({
        init,
        setNamespaceId,
        expandAllFrom: jest.fn(),
        expandPathTo: jest.fn(),
      }),
    }
  ),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function Probe({ rootResource }: { rootResource?: never }) {
  useSidebarInit({
    shareId: 'share-1',
    rootResource,
    canBrowseResources: false,
    showResources: false,
  });
  return null;
}

describe('useSidebarInit on a chat-only share', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    init.mockClear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  // A chat-only share returns no root resource at all.
  it('seeds no tree and does not throw when the root resource is absent', () => {
    expect(() =>
      act(() => {
        root.render(<Probe />);
      })
    ).not.toThrow();

    expect(init).not.toHaveBeenCalled();
    expect(setNamespaceId).toHaveBeenCalledWith('share-1');
  });
});
