/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import type { RssItem } from '@/interface';
import { fetchRssItems } from '@/service/resource';

import RssItemList from './RssItemList';

const listeners = new Map<string, (...args: any[]) => void>();
const on = jest.fn((event: string, listener: (...args: any[]) => void) => {
  listeners.set(event, listener);
  return () => listeners.delete(event);
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useParams: () => ({}),
}));
jest.mock('@/components/ResourceTypeIcon', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/components/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => children,
  TooltipContent: ({ children }: { children: React.ReactNode }) => children,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/components/ui/Sidebar', () => ({
  SidebarMenuButton: ({ children }: { children: React.ReactNode }) => children,
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
jest.mock('@/components/ui/Spinner', () => ({
  Spinner: () => <span>loading</span>,
}));
jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => ({ on }),
}));
jest.mock('@/service/resource', () => ({
  fetchRssItems: jest.fn(),
}));

const mockedFetchRssItems = jest.mocked(fetchRssItems);

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

function item(id: string, title: string): RssItem {
  return {
    id,
    link_id: 'link',
    link_name: null,
    title,
    url: null,
    summary: null,
    published_at: null,
    created_at: '',
  };
}

describe('RssItemList', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.clearAllMocks();
    listeners.clear();
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  it('keeps only the latest refresh result', async () => {
    const first = deferred<RssItem[]>();
    const second = deferred<RssItem[]>();
    mockedFetchRssItems
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    await act(async () => {
      root.render(
        <RssItemList folderId="folder" namespaceId="namespace" depth={1} />
      );
    });

    await act(async () => {
      listeners.get('refresh_rss_items')?.('folder');
    });

    await act(async () => {
      first.resolve([item('old', 'Old item')]);
    });
    expect(container.textContent).not.toContain('Old item');
    expect(container.textContent).toContain('loading');

    await act(async () => {
      second.resolve([item('new', 'New item')]);
    });
    expect(container.textContent).toContain('New item');
  });
});
