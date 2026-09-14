/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import type { PublicShareInfo, SharedResource } from '@/interface';

import { ShareLayout } from './ShareLayout';

let resizeCallback: ResizeObserverCallback;

jest.mock('react-router-dom', () => ({
  Outlet: ({ context }: { context?: { showToc?: boolean } }) => (
    <div data-testid="outlet" data-show-toc={String(context?.showToc)} />
  ),
  useLocation: () => ({ pathname: '/s/share-1/chat', state: null }),
}));
jest.mock('@/components/SidebarTriggerButton', () => ({
  SidebarTriggerButton: () => null,
}));
jest.mock('@/components/ui/Separator', () => ({ Separator: () => null }));
jest.mock('@/components/ui/Sidebar', () => ({
  SidebarInset: ({
    children,
    className,
    style,
  }: {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <div data-testid="share-inset" className={className} style={style}>
      {children}
    </div>
  ),
  useSidebar: () => ({ open: true, width: 240 }),
}));
jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => ({ fire: jest.fn(), on: () => () => {} }),
}));
jest.mock('@/page/resource/resourceStore', () => ({
  selectUseOmniboxEditor: () => true,
  useResourceStore: () => true,
}));
jest.mock('./header', () => ({
  __esModule: true,
  default: () => <div data-testid="share-header" />,
}));
jest.mock('./sidebar/index', () => ({
  __esModule: true,
  default: ({ showResources }: { showResources?: boolean }) => (
    <div
      data-testid="share-sidebar"
      data-show-resources={String(showResources)}
    />
  ),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const shareInfo = {
  id: 'share-1',
  all_resources: true,
  share_type: 'chat_only',
  username: 'tester',
  resource: { id: 'resource-1', name: 'Root', resource_type: 'folder' },
} as unknown as PublicShareInfo;

describe('ShareLayout', () => {
  let container: HTMLDivElement;
  let root: Root;
  let originalResizeObserver: typeof ResizeObserver | undefined;

  beforeEach(() => {
    originalResizeObserver = global.ResizeObserver;
    global.ResizeObserver = class implements ResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
      }

      disconnect() {}
      observe() {}
      unobserve() {}
    };
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    global.ResizeObserver = originalResizeObserver as typeof ResizeObserver;
  });

  const render = (
    chatOnly: boolean,
    isChatActive: boolean,
    resource?: SharedResource | null
  ) =>
    act(async () => {
      root.render(
        <ShareLayout
          shareInfo={shareInfo}
          isChatActive={isChatActive}
          showChat
          chatOnly={chatOnly}
          resource={resource}
          handleAddToContext={() => undefined}
        />
      );
    });

  it('keeps the chat sidebar entry but drops the resource tree and header', async () => {
    await render(true, true);

    const sidebar = container.querySelector('[data-testid="share-sidebar"]');
    expect(sidebar).not.toBeNull();
    expect(sidebar?.getAttribute('data-show-resources')).toBe('false');
    expect(container.querySelector('[data-testid="share-header"]')).toBeNull();
  });

  it('never shows the resource header, even before the redirect to chat', async () => {
    await render(true, false);

    expect(container.querySelector('[data-testid="share-header"]')).toBeNull();
  });

  it('keeps the resource tree and header on an ordinary share', async () => {
    await render(false, false);

    expect(
      container
        .querySelector('[data-testid="share-sidebar"]')
        ?.getAttribute('data-show-resources')
    ).toBe('true');
    expect(
      container.querySelector('[data-testid="share-header"]')
    ).not.toBeNull();
  });

  it('constrains the shared resource pane so list titles can truncate', async () => {
    await render(false, false);

    const inset = container.querySelector('[data-testid="share-inset"]');
    expect(inset?.className).toContain('min-w-0');
    expect(inset?.className).toContain('overflow-hidden');
    expect(container.querySelector('.overflow-y-auto')).not.toBeNull();
  });

  it('uses compact layout when the shared resource pane becomes narrow', async () => {
    await render(false, false);

    const scrollContainer = container.querySelector(
      '.overflow-y-auto'
    ) as HTMLDivElement;
    Object.defineProperty(scrollContainer, 'clientWidth', {
      configurable: true,
      value: 900,
    });
    await act(async () => {
      resizeCallback([], {} as ResizeObserver);
    });
    expect(
      container.querySelector('[data-testid="share-inset"]')?.classList
    ).not.toContain('resource-detail-view--compact');
    expect(
      container
        .querySelector('[data-testid="outlet"]')
        ?.getAttribute('data-show-toc')
    ).toBe('true');

    Object.defineProperty(scrollContainer, 'clientWidth', {
      configurable: true,
      value: 700,
    });
    await act(async () => {
      resizeCallback([], {} as ResizeObserver);
    });
    expect(
      container.querySelector('[data-testid="share-inset"]')?.classList
    ).toContain('resource-detail-view--compact');
    expect(
      container
        .querySelector('[data-testid="outlet"]')
        ?.getAttribute('data-show-toc')
    ).toBe('false');
  });

  it('lets a shared document use the full pane width like resource detail', async () => {
    await render(false, false, {
      id: 'doc-1',
      name: 'Note',
      resource_type: 'doc',
      content: '# Note',
      parent_id: null,
    } as SharedResource);

    const column = container.querySelector(
      '.overflow-y-auto > div'
    ) as HTMLDivElement;
    expect(column?.style.maxWidth).toBe('100%');
  });
});
