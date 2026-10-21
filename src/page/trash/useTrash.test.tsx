/** @jest-environment jsdom */

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import type { TrashItem, TrashListResponse } from './types';
import { useTrash } from './useTrash';

const listeners = new Map<string, Array<(...args: unknown[]) => void>>();

const mockApp = {
  on: (id: string, callback: (...args: unknown[]) => void) => {
    const list = listeners.get(id) ?? [];
    list.push(callback);
    listeners.set(id, list);
    return () => {
      listeners.set(
        id,
        (listeners.get(id) ?? []).filter(item => item !== callback)
      );
    };
  },
  fire: (id: string, ...args: unknown[]) => {
    (listeners.get(id) ?? []).forEach(callback => callback(...args));
  },
};

const mockGet = jest.fn();

jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => mockApp,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('react-router-dom', () => ({
  useParams: () => ({ namespace_id: 'ns-1' }),
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/request', () => ({
  http: {
    get: (...args: unknown[]) => mockGet(...args),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/page/sidebar/store', () => ({
  useSidebarStore: {
    getState: () => ({
      refetchSmartFolderEntitlements: jest.fn(),
      refetchRssFolderLimits: jest.fn(),
    }),
  },
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

interface TrashApi {
  items: TrashItem[];
  total: number;
  searchValue: string;
  setSearchValue: (value: string) => void;
  refresh: () => void;
  fetchTrash: (search?: string, offset?: number, append?: boolean) => void;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

function trashItem(id: string, name: string): TrashItem {
  return { id, name } as TrashItem;
}

function trashResponse(
  items: TrashItem[],
  total = items.length
): TrashListResponse {
  return {
    items,
    total,
    limit: 20,
    offset: 0,
    trash_retention_days: 7,
  };
}

describe('useTrash search races', () => {
  let container: HTMLDivElement;
  let root: Root;
  let api: TrashApi;

  beforeEach(() => {
    listeners.clear();
    mockGet.mockReset();
    jest.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.useRealTimers();
  });

  const renderHook = async () => {
    await act(async () => {
      root.render(
        (
          <Probe
            onState={state => {
              api = state;
            }}
          />
        ) as ReactNode
      );
    });
  };

  it('keeps search results when a slower full list returns later', async () => {
    const fullList = deferred<TrashListResponse>();
    const searchList = deferred<TrashListResponse>();
    mockGet
      .mockReturnValueOnce(fullList.promise)
      .mockReturnValueOnce(searchList.promise);

    await renderHook();
    await act(async () => {
      api.fetchTrash('', 0, false);
      api.setSearchValue('文件');
      jest.advanceTimersByTime(300);
    });

    expect(mockGet).toHaveBeenNthCalledWith(
      1,
      '/namespaces/ns-1/resources/trash?limit=20&offset=0'
    );
    expect(mockGet).toHaveBeenNthCalledWith(
      2,
      '/namespaces/ns-1/resources/trash?limit=20&offset=0&search=%E6%96%87%E4%BB%B6'
    );

    await act(async () => {
      searchList.resolve(trashResponse([trashItem('folder-1', '文件夹1')], 1));
    });
    expect(api.items.map(item => item.name)).toEqual(['文件夹1']);
    expect(api.total).toBe(0);

    await act(async () => {
      fullList.resolve(
        trashResponse(
          [trashItem('folder-1', '文件夹1'), trashItem('keep', '（请勿删除）')],
          2
        )
      );
    });

    expect(api.items.map(item => item.name)).toEqual(['文件夹1']);
    expect(api.total).toBe(2);
    expect(api.searchValue).toBe('文件');
  });

  it('refreshes the filtered list and the icon count after trash_updated', async () => {
    const initial = deferred<TrashListResponse>();
    const searched = deferred<TrashListResponse>();
    const refreshedSearch = deferred<TrashListResponse>();
    const refreshedCount = deferred<TrashListResponse>();
    mockGet
      .mockReturnValueOnce(initial.promise)
      .mockReturnValueOnce(searched.promise)
      .mockReturnValueOnce(refreshedSearch.promise)
      .mockReturnValueOnce(refreshedCount.promise);

    await renderHook();
    await act(async () => {
      api.fetchTrash('', 0, false);
    });
    await act(async () => {
      initial.resolve(trashResponse([trashItem('folder-1', '文件夹1')], 1));
    });

    await act(async () => {
      api.setSearchValue('文件');
      jest.advanceTimersByTime(300);
    });
    await act(async () => {
      searched.resolve(trashResponse([trashItem('folder-1', '文件夹1')], 1));
    });

    await act(async () => {
      mockApp.fire('trash_updated');
    });

    expect(mockGet).toHaveBeenNthCalledWith(
      3,
      '/namespaces/ns-1/resources/trash?limit=20&offset=0&search=%E6%96%87%E4%BB%B6'
    );
    expect(mockGet).toHaveBeenNthCalledWith(
      4,
      '/namespaces/ns-1/resources/trash?limit=20&offset=0'
    );

    await act(async () => {
      refreshedCount.resolve(
        trashResponse(
          [
            trashItem('folder-1', '文件夹1'),
            trashItem('keep', '（请勿删除）'),
            trashItem('new', '新文件'),
          ],
          3
        )
      );
    });
    expect(api.items.map(item => item.name)).toEqual(['文件夹1']);
    expect(api.total).toBe(3);

    await act(async () => {
      refreshedSearch.resolve(
        trashResponse(
          [trashItem('folder-1', '文件夹1'), trashItem('new', '新文件')],
          2
        )
      );
    });
    expect(api.items.map(item => item.name)).toEqual(['文件夹1', '新文件']);
    expect(api.total).toBe(3);
  });

  it('drops a stale load-more page after the keyword changes', async () => {
    const firstPage = deferred<TrashListResponse>();
    const nextPage = deferred<TrashListResponse>();
    const searched = deferred<TrashListResponse>();
    mockGet
      .mockReturnValueOnce(firstPage.promise)
      .mockReturnValueOnce(nextPage.promise)
      .mockReturnValueOnce(searched.promise);

    await renderHook();
    await act(async () => {
      api.fetchTrash('', 0, false);
    });
    await act(async () => {
      firstPage.resolve(
        trashResponse(
          [trashItem('a', '文件夹1'), trashItem('b', '（请勿删除）')],
          4
        )
      );
    });

    await act(async () => {
      api.fetchTrash('', 2, true);
      api.setSearchValue('文件');
      jest.advanceTimersByTime(300);
    });
    await act(async () => {
      nextPage.resolve(trashResponse([trashItem('c', '旧的下一页')], 4));
      searched.resolve(trashResponse([trashItem('a', '文件夹1')], 1));
    });

    expect(api.items.map(item => item.name)).toEqual(['文件夹1']);
  });
});

function Probe({ onState }: { onState: (state: TrashApi) => void }) {
  const trash = useTrash();
  onState({
    items: trash.items,
    total: trash.total,
    searchValue: trash.searchValue,
    setSearchValue: trash.setSearchValue,
    refresh: trash.refresh,
    fetchTrash: trash.fetchTrash,
  });
  return null;
}
