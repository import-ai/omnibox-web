/** @jest-environment jsdom */

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import type { RssItemDetail } from '@/interface';

import BreadcrumbMain from './BreadcrumbMain';

const navigate = jest.fn();
const unsubscribe = jest.fn();
let onRssItemLoaded: ((item: RssItemDetail) => void) | undefined;
const mockApp = {
  on: (event: string, callback: (item: RssItemDetail) => void) => {
    if (event === 'rss_item_loaded') {
      onRssItemLoaded = callback;
    }
    return unsubscribe;
  },
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useParams: () => ({ rss_item_id: 'item-1' }),
}));
jest.mock('@/components/ui/Breadcrumb', () => ({
  Breadcrumb: 'nav',
  BreadcrumbEllipsis: 'span',
  BreadcrumbItem: 'li',
  BreadcrumbLink: ({ children }: { children?: ReactNode }) => children,
  BreadcrumbList: 'ol',
  BreadcrumbPage: 'span',
  BreadcrumbSeparator: 'span',
}));
jest.mock('@/components/ui/DropdownMenu', () => ({
  DropdownMenu: 'div',
  DropdownMenuContent: 'div',
  DropdownMenuItem: 'button',
  DropdownMenuTrigger: 'button',
}));
jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => mockApp,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('BreadcrumbMain', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.clearAllMocks();
    onRssItemLoaded = undefined;
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  it('makes the RSS folder clickable after the current item loads', async () => {
    await act(async () => {
      root.render(
        <BreadcrumbMain
          namespaceId="namespace-1"
          path={[
            { id: 'root-1', name: 'Root' },
            { id: 'folder-1', name: 'RSS Folder' },
          ]}
        />
      );
    });

    await act(async () => {
      onRssItemLoaded?.({ id: 'item-1', title: 'Article' } as RssItemDetail);
    });

    expect(container.textContent).toContain('RSS Folder');
    expect(container.textContent).toContain('Article');

    const folderButton = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent === 'RSS Folder'
    );
    folderButton?.click();

    expect(navigate).toHaveBeenCalledWith('/namespace-1/folder-1');
  });
});
