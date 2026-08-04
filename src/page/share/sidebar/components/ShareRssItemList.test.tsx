/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { fetchShareRssItems } from '@/service/share';

import ShareRssItemList from './ShareRssItemList';

const navigate = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useParams: () => ({}),
}));
jest.mock('@/components/ResourceTypeIcon', () => () => null);
jest.mock('@/components/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => children,
  TooltipContent: ({ children }: { children: React.ReactNode }) => children,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/components/ui/Sidebar', () => ({
  SidebarMenuButton: ({
    children,
    onClick,
  }: React.ComponentProps<'button'>) => (
    <button onClick={onClick}>{children}</button>
  ),
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
jest.mock('@/service/share', () => ({
  fetchShareRssItems: jest.fn(),
}));

const mockedFetchShareRssItems = jest.mocked(fetchShareRssItems);

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('ShareRssItemList', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
    root = createRoot(container);
    mockedFetchShareRssItems.mockResolvedValue([
      {
        id: 'item-1',
        link_id: 'link-1',
        link_name: 'Example',
        title: 'Article',
        url: 'https://example.com/article',
        summary: null,
        published_at: null,
        created_at: '2026-08-04T00:00:00Z',
      },
    ]);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  it('marks item navigation as originating from the sidebar', async () => {
    await act(async () => {
      root.render(<ShareRssItemList folderId="folder-1" shareId="share-1" />);
    });

    await act(async () => {
      container.querySelector('button')?.click();
    });

    expect(navigate).toHaveBeenCalledWith(
      '/s/share-1/folder-1/rss-items/item-1',
      { state: { fromSidebar: true } }
    );
  });
});
