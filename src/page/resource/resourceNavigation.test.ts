/** @jest-environment jsdom */

import type { NavigateFunction } from 'react-router-dom';

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

describe('navigateToResource', () => {
  beforeEach(() => {
    clearWarmedResource();
    mockedFetchResource.mockReset();
    window.history.pushState({}, '', '/');
  });

  it('synchronously commits the resource route while preserving navigation state', () => {
    const navigate = jest.fn() as jest.MockedFunction<NavigateFunction>;

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
    const navigate = jest.fn() as jest.MockedFunction<NavigateFunction>;

    navigateToResource(navigate, '/s/share-a/resource-b');

    expect(mockedFetchResource).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/s/share-a/resource-b', {
      flushSync: true,
    });
  });

  it('waits for the resource before leaving a chat route', async () => {
    window.history.pushState({}, '', '/namespace-a/chat');
    const navigate = jest.fn() as jest.MockedFunction<NavigateFunction>;
    const resource = { id: 'resource-b', name: 'Resource B' } as Resource;
    mockedFetchResource.mockResolvedValue(resource);

    navigateToResource(navigate, '/namespace-a/resource-b');

    expect(navigate).not.toHaveBeenCalled();

    await flushPromises();

    expect(mockedFetchResource).toHaveBeenCalledWith(
      'namespace-a',
      'resource-b'
    );
    expect(getWarmedResource('namespace-a', 'resource-b')).toEqual(resource);
    expect(navigate).toHaveBeenCalledWith('/namespace-a/resource-b', {
      flushSync: true,
    });
  });

  it('still leaves chat when warming the resource fails', async () => {
    window.history.pushState({}, '', '/namespace-a/chat');
    const navigate = jest.fn() as jest.MockedFunction<NavigateFunction>;
    mockedFetchResource.mockRejectedValue(new Error('not found'));

    navigateToResource(navigate, '/namespace-a/resource-b');
    await flushPromises();

    expect(getWarmedResource('namespace-a', 'resource-b')).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/namespace-a/resource-b', {
      flushSync: true,
    });
  });

  it('does not open the resource after a later chat navigation, even if the URL is unchanged', async () => {
    window.history.pushState({}, '', '/namespace-a/chat');
    const navigate = jest.fn() as jest.MockedFunction<NavigateFunction>;
    let resolveFetch: (resource: Resource) => void = () => undefined;
    mockedFetchResource.mockReturnValue(
      new Promise(resolve => {
        resolveFetch = resolve;
      })
    );

    navigateToResource(navigate, '/namespace-a/resource-b');
    navigateToResource(navigate, '/namespace-a/chat/conversations');

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/namespace-a/chat/conversations', {
      flushSync: true,
    });

    resolveFetch({ id: 'resource-b', name: 'Resource B' } as Resource);
    await flushPromises();

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(getWarmedResource('namespace-a', 'resource-b')).toBeNull();
  });
});
