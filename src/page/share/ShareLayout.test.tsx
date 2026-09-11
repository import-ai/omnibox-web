/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { TooltipProvider } from '@/components/tooltip';
import type { PublicShareInfo, SharedResource } from '@/interface';
import { useResourceCommentsPanel } from '@/page/resource/comments/ResourceCommentsContext';
import { ResourceCommentsToggleButton } from '@/page/resource/comments/ResourceCommentsToggleButton';

import { ShareLayout } from './ShareLayout';

jest.mock('react-router-dom', () => ({
  Outlet: () => {
    const panel = useResourceCommentsPanel();
    return <div data-testid="outlet" data-comments-open={!!panel?.panelOpen} />;
  },
  useLocation: () => ({ pathname: '/s/share-1/chat', state: null }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/components/SidebarTriggerButton', () => ({
  SidebarTriggerButton: () => null,
}));
jest.mock('@/components/ui/Separator', () => ({ Separator: () => null }));
jest.mock('@/components/ui/Sidebar', () => ({
  SidebarInset: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
jest.mock('./header', () => ({
  __esModule: true,
  default: ({ showComments }: { showComments?: boolean }) => (
    <header data-testid="share-header">
      {showComments && <ResourceCommentsToggleButton />}
    </header>
  ),
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

  beforeEach(() => {
    sessionStorage.clear();
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  const render = (
    chatOnly: boolean,
    isChatActive: boolean,
    resource?: SharedResource
  ) =>
    act(async () => {
      root.render(
        <TooltipProvider>
          <ShareLayout
            shareInfo={shareInfo}
            isChatActive={isChatActive}
            showChat
            chatOnly={chatOnly}
            handleAddToContext={() => undefined}
            resource={resource}
          />
        </TooltipProvider>
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

  const documentResource: SharedResource = {
    id: 'document',
    parent_id: null,
    resource_type: 'doc',
    content: '# Content',
  };

  it.each([
    { chatOnly: false, isChatActive: false, overflow: 'overflow-auto' },
    { chatOnly: false, isChatActive: true, overflow: 'overflow-hidden' },
    { chatOnly: true, isChatActive: true, overflow: 'overflow-hidden' },
  ])(
    'renders one outlet with $overflow when chatOnly=$chatOnly and isChatActive=$isChatActive',
    async ({ chatOnly, isChatActive, overflow }) => {
      await render(chatOnly, isChatActive, documentResource);

      const outlets = container.querySelectorAll('[data-testid="outlet"]');
      expect(outlets).toHaveLength(1);
      expect(outlets[0].parentElement?.classList.contains(overflow)).toBe(true);
      expect(container.querySelectorAll('header')).toHaveLength(1);
    }
  );

  it.each<SharedResource['resource_type']>(['doc', 'file', 'link', 'rss_item'])(
    'shows the header comment action for a %s with content and toggles the body panel',
    async resourceType => {
      await render(false, false, {
        ...documentResource,
        resource_type: resourceType,
      });
      const button =
        container.querySelector<HTMLButtonElement>('header button');
      expect(button).not.toBeNull();
      expect(button?.getAttribute('aria-pressed')).toBe('false');
      await act(async () => button?.click());
      expect(button?.getAttribute('aria-pressed')).toBe('true');
      expect(
        container
          .querySelector('[data-testid="outlet"]')
          ?.getAttribute('data-comments-open')
      ).toBe('true');
      await act(async () => button?.click());
      expect(button?.getAttribute('aria-pressed')).toBe('false');
    }
  );

  it.each<SharedResource['resource_type']>([
    'folder',
    'smart_folder',
    'rss_folder',
  ])('hides comments for a %s even if it has content', async resourceType => {
    await render(false, false, {
      ...documentResource,
      resource_type: resourceType,
    });
    expect(container.querySelector('header button')).toBeNull();
    expect(container.querySelector('.resource-comments-panel')).toBeNull();
  });

  it.each(['', ' \n\t '])(
    'hides comments for empty content %j',
    async content => {
      await render(false, false, { ...documentResource, content });
      expect(container.querySelector('header button')).toBeNull();
    }
  );

  it('removes the panel when navigating from a document to a folder', async () => {
    await render(false, false, documentResource);
    await act(async () =>
      container.querySelector<HTMLButtonElement>('header button')?.click()
    );
    await render(false, false, {
      ...documentResource,
      id: 'folder',
      resource_type: 'folder',
    });
    expect(container.querySelector('header button')).toBeNull();
    expect(container.querySelector('.resource-comments-panel')).toBeNull();
  });
});
