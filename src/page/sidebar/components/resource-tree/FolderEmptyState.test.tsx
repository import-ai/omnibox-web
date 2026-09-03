/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import FolderEmptyState from './FolderEmptyState';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      key === 'rss_folder.loading' ? '正在加载…' : '空空如也',
  }),
}));
jest.mock('@/components/ui/Sidebar', () => ({
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('FolderEmptyState', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('shows the shared folder empty state', async () => {
    await act(async () => {
      root.render(<FolderEmptyState depth={1} />);
    });

    expect(container.textContent).toBe('空空如也');
    expect(
      (container.firstElementChild?.firstElementChild as HTMLElement).style
        .paddingLeft
    ).toBe('48px');
  });

  it('shows the rss loading state', async () => {
    await act(async () => {
      root.render(<FolderEmptyState depth={1} loading />);
    });

    expect(container.textContent).toBe('正在加载…');
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
