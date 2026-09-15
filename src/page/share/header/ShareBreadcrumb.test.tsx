/** @jest-environment jsdom */

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import ShareBreadcrumb from './ShareBreadcrumb';

const navigate = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useParams: () => ({ share_id: 'share-1' }),
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

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('ShareBreadcrumb', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  it('renders a shared rss item path and keeps its folder clickable', async () => {
    await act(async () => {
      root.render(
        <ShareBreadcrumb
          path={[
            { id: 'root-1', name: 'Root' },
            { id: 'folder-1', name: 'RSS Folder' },
            { id: 'item-1', name: 'Shared Article' },
          ]}
        />
      );
    });

    expect(container.textContent).toContain('RSS Folder');
    expect(container.textContent).toContain('Shared Article');

    const folderButton = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent === 'RSS Folder'
    );
    folderButton?.click();

    expect(navigate).toHaveBeenCalledWith('/s/share-1/folder-1');
  });

  it('falls back to the shared resource itself when it has no path', async () => {
    await act(async () => {
      root.render(
        <ShareBreadcrumb fallbackId="folder-1" fallbackName="RSS Folder" />
      );
    });

    expect(container.textContent).toContain('RSS Folder');
    // The shared root is the current page, so it is not a link.
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });

  it('ellipsis-truncates a long current shared resource name', async () => {
    const longName =
      '河南省2026年普通高校招生定向培养军士政治考核和体格检查控制分数线';

    await act(async () => {
      root.render(
        <ShareBreadcrumb
          path={[
            { id: 'root-1', name: 'Root' },
            { id: 'item-1', name: longName },
          ]}
        />
      );
    });

    const currentPage = Array.from(container.querySelectorAll('span')).find(
      node => node.textContent === longName
    );

    expect(currentPage?.classList.contains('truncate')).toBe(true);
    expect(currentPage?.classList.contains('min-w-0')).toBe(true);
    expect(currentPage?.classList.contains('block')).toBe(true);
    expect(
      currentPage?.parentElement?.classList.contains('overflow-hidden')
    ).toBe(true);
  });
});
