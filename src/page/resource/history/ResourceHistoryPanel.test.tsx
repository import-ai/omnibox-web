/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import {
  fetchResourceRevision,
  fetchResourceRevisions,
  type ResourceRevisionDetail,
  type ResourceRevisionSummary,
} from '@/service/resource';

import ResourceHistoryPanel from './ResourceHistoryPanel';
import { useResourceHistoryStore } from './resourceHistoryStore';

const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};

const mockApp = {
  fire: jest.fn(),
  on: jest.fn((event: string, callback: (...args: unknown[]) => void) => {
    listeners[event] = listeners[event] || [];
    listeners[event].push(callback);
    return () => {
      listeners[event] = (listeners[event] || []).filter(
        listener => listener !== callback
      );
    };
  }),
};

jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => mockApp,
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en' },
    t: (key: string) => key,
  }),
}));
jest.mock('@/page/copilot/CopilotToggleButton', () => ({
  __esModule: true,
  default: () => <button type="button">toggle</button>,
}));
jest.mock('@/service/resource', () => ({
  fetchResourceRevision: jest.fn(),
  fetchResourceRevisions: jest.fn(),
}));

const mockedFetchRevisions = jest.mocked(fetchResourceRevisions);
const mockedFetchRevision = jest.mocked(fetchResourceRevision);

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function fireApp(event: string, ...args: unknown[]) {
  for (const listener of listeners[event] || []) {
    listener(...args);
  }
}

function revision(
  id: string,
  name: string,
  createdAt: string,
  version = 1
): ResourceRevisionSummary {
  return {
    id,
    version,
    name,
    created_at: createdAt,
    author: { id: 'user-a', username: 'Ada' },
    is_current: id === 'current',
  };
}

const initialRevisions = [
  revision('current', 'Doc', '2026-09-20T08:00:00.000Z'),
];
const updatedRevisions = [
  revision('current', 'Doc v2', '2026-09-20T09:00:00.000Z', 2),
  revision('revision-a', 'Doc', '2026-09-20T08:00:00.000Z'),
];

describe('ResourceHistoryPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    Object.keys(listeners).forEach(key => {
      delete listeners[key];
    });
    window.history.replaceState({}, '', '/namespace-a/resource-a');
    mockedFetchRevision.mockReset();
    useResourceHistoryStore.setState({ selections: {} });
    mockedFetchRevisions.mockResolvedValue(initialRevisions);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.clearAllMocks();
  });

  async function renderPanel(resourceId = 'resource-a') {
    await act(async () => {
      root.render(
        <ResourceHistoryPanel
          namespaceId="namespace-a"
          resourceId={resourceId}
        />
      );
    });
  }

  it('loads revisions once on mount', async () => {
    await renderPanel();

    expect(mockedFetchRevisions).toHaveBeenCalledTimes(1);
    expect(mockedFetchRevisions).toHaveBeenCalledWith(
      'namespace-a',
      'resource-a'
    );
    expect(container.textContent).toContain('Doc');
    expect(container.textContent).toContain('resource.history.current');
    expect(container.textContent).toContain('v1 · Doc');
  });

  it('refetches the revision list when the open resource is updated', async () => {
    await renderPanel();
    mockedFetchRevisions.mockResolvedValue(updatedRevisions);

    await act(async () => {
      fireApp('update_resource', { id: 'resource-a', name: 'Doc v2' });
    });

    expect(mockedFetchRevisions).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain('Doc v2');
    expect(container.textContent).toContain('Doc');
  });

  it('refetches when a copilot edit reports the resource id', async () => {
    await renderPanel();
    mockedFetchRevisions.mockResolvedValue(updatedRevisions);

    await act(async () => {
      fireApp('refresh_resource', 'resource-a');
    });

    expect(mockedFetchRevisions).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain('Doc v2');
  });

  it('ignores updates for other resources', async () => {
    await renderPanel();

    await act(async () => {
      fireApp('update_resource', { id: 'resource-b', name: 'Other' });
      fireApp('refresh_resource', 'resource-b');
    });

    expect(mockedFetchRevisions).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Doc');
    expect(container.textContent).not.toContain('Doc v2');
  });

  it('refetches after the initial load if the resource changes while loading', async () => {
    let resolveInitial: (value: ResourceRevisionSummary[]) => void = () =>
      undefined;
    mockedFetchRevisions.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveInitial = resolve;
        })
    );
    mockedFetchRevisions.mockResolvedValue(updatedRevisions);

    await act(async () => {
      root.render(
        <ResourceHistoryPanel
          namespaceId="namespace-a"
          resourceId="resource-a"
        />
      );
    });

    expect(container.querySelector('.animate-spin')).not.toBeNull();
    expect(mockedFetchRevisions).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireApp('update_resource', { id: 'resource-a', name: 'Doc v2' });
    });

    expect(mockedFetchRevisions).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveInitial(initialRevisions);
    });

    expect(mockedFetchRevisions).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain('Doc v2');
    expect(container.querySelector('.animate-spin')).toBeNull();
  });

  it('keeps a selected historical revision after the live resource changes', async () => {
    const historical: ResourceRevisionDetail = {
      ...revision('revision-a', 'Doc', '2026-09-20T08:00:00.000Z'),
      resource_id: 'resource-a',
      content: '# Previous',
      content_hash: 'hash-a',
    };
    mockedFetchRevisions.mockResolvedValue(updatedRevisions);
    mockedFetchRevision.mockResolvedValue(historical);

    await renderPanel();

    const historicalButton = Array.from(
      container.querySelectorAll('button')
    ).find(
      button =>
        button.textContent?.includes('Doc') &&
        !button.textContent?.includes('Doc v2') &&
        !button.textContent?.includes('resource.history.current')
    );
    expect(historicalButton).toBeDefined();

    await act(async () => {
      historicalButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      );
    });

    expect(
      useResourceHistoryStore.getState().selections['namespace-a:resource-a']
        ?.id
    ).toBe('revision-a');
    expect(historicalButton?.className).toContain('bg-accent');

    mockedFetchRevisions.mockResolvedValue([
      revision('current', 'Doc v3', '2026-09-20T10:00:00.000Z'),
      revision('revision-b', 'Doc v2', '2026-09-20T09:00:00.000Z'),
      revision('revision-a', 'Doc', '2026-09-20T08:00:00.000Z'),
    ]);

    await act(async () => {
      fireApp('update_resource', { id: 'resource-a', name: 'Doc v3' });
    });

    expect(
      useResourceHistoryStore.getState().selections['namespace-a:resource-a']
        ?.id
    ).toBe('revision-a');
    expect(container.textContent).toContain('Doc v3');
    const selectedButton = Array.from(
      container.querySelectorAll('button')
    ).find(
      button =>
        button.textContent?.includes('Doc') &&
        !button.textContent?.includes('Doc v2') &&
        !button.textContent?.includes('Doc v3')
    );
    expect(selectedButton?.className).toContain('bg-accent');
  });

  it('does not replace the list with a spinner while refetching', async () => {
    let resolveRefresh: (value: ResourceRevisionSummary[]) => void = () =>
      undefined;
    await renderPanel();

    mockedFetchRevisions.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveRefresh = resolve;
        })
    );

    await act(async () => {
      fireApp('update_resource', { id: 'resource-a', name: 'Doc v2' });
    });

    expect(container.querySelector('.animate-spin')).toBeNull();
    expect(container.textContent).toContain('Doc');
    expect(container.textContent).toContain('resource.history.current');

    await act(async () => {
      resolveRefresh(updatedRevisions);
    });

    expect(container.textContent).toContain('Doc v2');
  });
  it.each(['current', 'header', 'resource', 'unmount'])(
    'ignores a pending detail response after navigating via %s',
    async navigation => {
      mockedFetchRevisions.mockResolvedValue(updatedRevisions);
      let resolveDetail!: (value: ResourceRevisionDetail) => void;
      mockedFetchRevision.mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveDetail = resolve;
          })
      );
      await renderPanel();
      const buttons = Array.from(container.querySelectorAll('button'));
      const historical = buttons.find(
        button =>
          button.textContent?.includes('Doc') &&
          !button.textContent?.includes('Doc v2')
      )!;
      await act(async () => historical.click());
      if (navigation === 'current') {
        await act(async () =>
          buttons
            .find(button =>
              button.textContent?.includes('resource.history.current')
            )!
            .click()
        );
      } else if (navigation === 'header') {
        await act(async () =>
          useResourceHistoryStore
            .getState()
            .clearRevision('namespace-a', 'resource-a')
        );
      } else if (navigation === 'resource') {
        window.history.replaceState({}, '', '/namespace-a/resource-b');
        await renderPanel('resource-b');
      } else {
        await act(async () => root.render(null));
      }
      await act(async () =>
        resolveDetail({
          ...updatedRevisions[1],
          resource_id: 'resource-a',
          content: 'Old',
          content_hash: 'hash',
        })
      );
      expect(
        useResourceHistoryStore.getState().selections['namespace-a:resource-a']
      ).toBeUndefined();
      expect(window.location.search).toBe('');
    }
  );

  it('keeps the last clicked revision when details arrive out of order', async () => {
    const second = revision('revision-b', 'Second', '2026-09-20T07:00:00.000Z');
    mockedFetchRevisions.mockResolvedValue([...updatedRevisions, second]);
    let resolveFirst!: (value: ResourceRevisionDetail) => void;
    mockedFetchRevision.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveFirst = resolve;
        })
    );
    mockedFetchRevision.mockResolvedValue({
      ...second,
      resource_id: 'resource-a',
      content: 'Second',
      content_hash: 'second',
    });
    await renderPanel();
    const buttons = Array.from(container.querySelectorAll('button'));
    await act(async () =>
      buttons
        .find(
          button =>
            button.textContent?.includes('Doc') &&
            !button.textContent?.includes('Doc v2')
        )!
        .click()
    );
    await act(async () =>
      buttons.find(button => button.textContent?.includes('Second'))!.click()
    );
    await act(async () =>
      resolveFirst({
        ...updatedRevisions[1],
        resource_id: 'resource-a',
        content: 'First',
        content_hash: 'first',
      })
    );
    expect(
      useResourceHistoryStore.getState().selections['namespace-a:resource-a'].id
    ).toBe('revision-b');
    expect(window.location.search).toBe('?revision=revision-b');
    expect(container.querySelector('.animate-spin')).toBeNull();
  });
});
