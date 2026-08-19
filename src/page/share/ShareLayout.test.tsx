/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import type { PublicShareInfo } from '@/interface';

import { ShareLayout } from './ShareLayout';

jest.mock('react-router-dom', () => ({
  Outlet: () => <div data-testid="outlet" />,
  useLocation: () => ({ pathname: '/s/share-1/chat', state: null }),
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

  beforeEach(() => {
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  const render = (chatOnly: boolean, isChatActive: boolean) =>
    act(async () => {
      root.render(
        <ShareLayout
          shareInfo={shareInfo}
          isChatActive={isChatActive}
          showChat
          chatOnly={chatOnly}
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
});
