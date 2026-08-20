/** @jest-environment jsdom */

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import BreadcrumbMain from './BreadcrumbMain';

const navigate = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
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

describe('BreadcrumbMain', () => {
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

  it('renders an rss item path with its folder still clickable', async () => {
    await act(async () => {
      root.render(
        <BreadcrumbMain
          namespaceId="namespace-1"
          path={[
            { id: 'root-1', name: 'Root' },
            { id: 'folder-1', name: 'RSS Folder' },
            { id: 'item-1', name: 'Article' },
          ]}
        />
      );
    });

    expect(container.textContent).toContain('RSS Folder');
    expect(container.textContent).toContain('Article');

    const folderButton = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent === 'RSS Folder'
    );
    folderButton?.click();

    expect(navigate).toHaveBeenCalledWith('/namespace-1/folder-1', {
      flushSync: true,
    });
    // The item itself is the current page, so it is not a link.
    expect(
      Array.from(container.querySelectorAll('button')).some(
        button => button.textContent === 'Article'
      )
    ).toBe(false);
  });

  it('keeps a deeply nested folder clickable', async () => {
    await act(async () => {
      root.render(
        <BreadcrumbMain
          namespaceId="namespace-1"
          path={[
            { id: 'root-1', name: 'Root' },
            { id: 'folder-1', name: 'Folder 1' },
            { id: 'folder-2', name: 'Folder 2' },
            { id: 'rss-folder', name: 'RSS Folder' },
            { id: 'item-1', name: 'Article' },
          ]}
        />
      );
    });

    const folderButton = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent === 'RSS Folder'
    );
    folderButton?.click();

    expect(navigate).toHaveBeenCalledWith('/namespace-1/rss-folder', {
      flushSync: true,
    });
  });

  it('truncates long folder names from the end', async () => {
    const longFolderName =
      'A very long nested folder name that should keep its beginning';

    await act(async () => {
      root.render(
        <BreadcrumbMain
          namespaceId="namespace-1"
          path={[
            { id: 'root-1', name: 'Root' },
            { id: 'folder-1', name: longFolderName },
            { id: 'resource-1', name: 'Current resource' },
          ]}
        />
      );
    });

    const folderButton = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent === longFolderName
    );
    const folderName = folderButton?.querySelector('span');

    expect(folderButton?.classList.contains('justify-start')).toBe(true);
    expect(folderButton?.classList.contains('overflow-hidden')).toBe(true);
    expect(folderName?.classList.contains('min-w-0')).toBe(true);
    expect(folderName?.classList.contains('truncate')).toBe(true);
    expect(folderName?.classList.contains('text-left')).toBe(true);
  });
});
