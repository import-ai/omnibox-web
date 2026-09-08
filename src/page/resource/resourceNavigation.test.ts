/** @jest-environment jsdom */

import type { NavigateFunction, To } from 'react-router-dom';

import type { Resource } from '@/interface';
import { fetchResource } from '@/service/resource';

import { navigateToResource } from './resourceNavigation';
import { clearWarmedResource, getWarmedResource } from './resourcePageCache';

jest.mock('@/service/resource', () => ({
  fetchResource: jest.fn(),
}));

const mockedFetchResource = jest.mocked(fetchResource);

async function flushPromises() {
  await new Promise(resolve => setTimeout(resolve, 0));
}

function mockNavigate() {
  const navigate = jest.fn((to: To) => {
    window.history.pushState(
      {},
      '',
      typeof to === 'string' ? to : to.pathname || ''
    );
  }) as jest.MockedFunction<NavigateFunction>;
  return navigate;
}

describe('navigateToResource', () => {
  beforeEach(() => {
    clearWarmedResource();
    mockedFetchResource.mockReset();
    window.history.pushState({}, '', '/');
  });

  it('synchronously commits the resource route while preserving navigation state', () => {
    const navigate = mockNavigate();

    navigateToResource(navigate, '/namespace-a/resource-b', {
      state: { fromSidebar: true },
    });

    expect(navigate).toHaveBeenCalledWith('/namespace-a/resource-b', {
      flushSync: true,
      state: { fromSidebar: true },
    });
    expect(mockedFetchResource).not.toHaveBeenCalled();
  });

  it('does not delay share targets from a chat route', () => {
    window.history.pushState({}, '', '/namespace-a/chat');
    const navigate = mockNavigate();

    navigateToResource(navigate, '/s/share-a/resource-b');

    expect(mockedFetchResource).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/s/share-a/resource-b', {
      flushSync: true,
    });
  });

  it('leaves chat immediately and warms the resource if that route is still open', async () => {
    window.history.pushState({}, '', '/namespace-a/chat');
    const navigate = mockNavigate();
    const resource = { id: 'resource-b', name: 'Resource B' } as Resource;
    mockedFetchResource.mockResolvedValue(resource);

    navigateToResource(navigate, '/namespace-a/resource-b');

    expect(navigate).toHaveBeenCalledWith('/namespace-a/resource-b', {
      flushSync: true,
    });

    await flushPromises();

    expect(mockedFetchResource).toHaveBeenCalledWith(
      'namespace-a',
      'resource-b'
    );
    expect(getWarmedResource('namespace-a', 'resource-b')).toEqual(resource);
  });

  it('still leaves chat when warming the resource fails', async () => {
    window.history.pushState({}, '', '/namespace-a/chat');
    const navigate = mockNavigate();
    mockedFetchResource.mockRejectedValue(new Error('not found'));

    navigateToResource(navigate, '/namespace-a/resource-b');
    await flushPromises();

    expect(getWarmedResource('namespace-a', 'resource-b')).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/namespace-a/resource-b', {
      flushSync: true,
    });
  });

  it('does not open the resource or write cache after a later chat navigation', async () => {
    window.history.pushState({}, '', '/namespace-a/chat');
    const navigate = mockNavigate();
    let resolveFetch: (resource: Resource) => void = () => undefined;
    mockedFetchResource.mockReturnValue(
      new Promise(resolve => {
        resolveFetch = resolve;
      })
    );

    navigateToResource(navigate, '/namespace-a/resource-b');
    navigateToResource(navigate, '/namespace-a/chat/conversations');

    expect(navigate).toHaveBeenNthCalledWith(1, '/namespace-a/resource-b', {
      flushSync: true,
    });
    expect(navigate).toHaveBeenNthCalledWith(
      2,
      '/namespace-a/chat/conversations',
      {
        flushSync: true,
      }
    );

    resolveFetch({ id: 'resource-b', name: 'Resource B' } as Resource);
    await flushPromises();

    expect(navigate).toHaveBeenCalledTimes(2);
    expect(getWarmedResource('namespace-a', 'resource-b')).toBeNull();
  });

  it('does not let an in-flight warm steal a later edit or search navigation', async () => {
    window.history.pushState({}, '', '/namespace-a/chat');
    const navigate = mockNavigate();
    let resolveFetch: (resource: Resource) => void = () => undefined;
    mockedFetchResource.mockReturnValue(
      new Promise(resolve => {
        resolveFetch = resolve;
      })
    );

    navigateToResource(navigate, '/namespace-a/resource-b');
    navigateToResource(navigate, '/namespace-a/resource-c/edit', {
      state: { fromSidebar: true },
    });

    expect(navigate).toHaveBeenNthCalledWith(1, '/namespace-a/resource-b', {
      flushSync: true,
    });
    expect(navigate).toHaveBeenNthCalledWith(
      2,
      '/namespace-a/resource-c/edit',
      {
        flushSync: true,
        state: { fromSidebar: true },
      }
    );

    resolveFetch({ id: 'resource-b', name: 'Resource B' } as Resource);
    await flushPromises();

    expect(navigate).toHaveBeenCalledTimes(2);
    expect(getWarmedResource('namespace-a', 'resource-b')).toBeNull();
    expect(getWarmedResource('namespace-a', 'resource-c')).toBeNull();
  });
});
