/** @jest-environment jsdom */

import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { RssItemBreadcrumb } from '@/interface';
import { fetchShareRssItem } from '@/service/share';

import SharedResourcePage from '.';

let mockShareContext: Record<string, unknown>;
let mockShouldReportLoadedItem = true;

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('react-router-dom', () => ({
  useParams: () => ({ rss_item_id: 'item-1' }),
}));
jest.mock('@/components/attributes', () => 'div');
jest.mock('@/components/loading', () => 'div');
jest.mock('@/components/ui/Sidebar', () => ({
  useSidebar: () => ({ open: false }),
}));
jest.mock('@/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
  setDocumentTitle: jest.fn(),
}));
jest.mock('@/page/auth/DeletedResourcePage', () => 'div');
jest.mock('@/service/share', () => ({
  fetchShareRssItem: jest.fn(),
  fetchShareRssItems: jest.fn(),
}));
jest.mock('../resource/folder', () => 'div');
jest.mock('../resource/Render', () => 'div');
jest.mock('../resource/rss', () => 'div');
jest.mock('../resource/rss/RssItemReader', () => {
  const { useEffect } = jest.requireActual('react') as typeof import('react');
  return {
    __esModule: true,
    default: function MockRssItemReader({
      fetchItem,
      onItemLoaded,
    }: {
      fetchItem: () => Promise<RssItemBreadcrumb>;
      onItemLoaded: (item: RssItemBreadcrumb) => void;
    }) {
      useEffect(() => {
        void fetchItem().then(item => {
          if (mockShouldReportLoadedItem) {
            mockShouldReportLoadedItem = false;
            onItemLoaded(item);
          }
        });
      }, [fetchItem, onItemLoaded]);
      return null;
    },
  };
});
jest.mock('../share', () => ({
  useShareContext: () => mockShareContext,
}));

const mockedFetchShareRssItem = jest.mocked(fetchShareRssItem);

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('SharedResourcePage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.clearAllMocks();
    mockShouldReportLoadedItem = true;
    mockedFetchShareRssItem.mockResolvedValue({
      id: 'item-1',
      title: 'Article',
    } as never);
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  it('does not refetch after the loaded item updates share context', async () => {
    function Harness() {
      const [rssItem, setRssItem] = useState<RssItemBreadcrumb | null>(null);
      mockShareContext = {
        notFound: false,
        shareInfo: { id: 'share-1' },
        resource: {
          id: 'folder-1',
          name: 'RSS Folder',
          resource_type: 'rss_folder',
        },
        rssItem,
        setRssItem,
        wide: false,
      };
      return <SharedResourcePage />;
    }

    await act(async () => {
      root.render(<Harness />);
    });

    expect(mockedFetchShareRssItem).toHaveBeenCalledTimes(1);
  });
});
