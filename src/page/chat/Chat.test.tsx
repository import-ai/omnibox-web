/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { useCopilotStore } from '@/page/copilot/copilotStore';

import Chat from './index';

jest.mock('react-router-dom', () => ({
  useParams: () => ({
    conversation_id: 'conversation-a',
    namespace_id: 'namespace-a',
  }),
}));

jest.mock('@/components/ui/Sidebar', () => ({
  SidebarInset: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock('./ChatPage', () => ({
  __esModule: true,
  default: () => <div data-testid="route-chat-page" />,
}));

jest.mock('./header', () => ({
  __esModule: true,
  default: () => <div data-testid="chat-header" />,
}));

jest.mock('@/page/copilot/CopilotView', () => ({
  __esModule: true,
  default: () => <div data-testid="copilot-view" />,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('Chat', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useCopilotStore.setState({ workspaces: {} });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.clearAllMocks();
  });

  it('reuses the route conversation when the citation belongs to that conversation', async () => {
    const store = useCopilotStore.getState();
    store.showConversation('namespace-a', 'conversation-a');
    store.previewResource('namespace-a', 'Abcd1234Efgh5678');

    await act(async () => root.render(<Chat />));

    expect(
      container.querySelector('[data-testid="route-chat-page"]')
    ).not.toBeNull();
    expect(container.querySelector('[data-testid="copilot-view"]')).toBeNull();
  });

  it('unmounts the route conversation while another Copilot view is active', async () => {
    const store = useCopilotStore.getState();
    store.previewResource('namespace-a', 'Abcd1234Efgh5678');
    store.showHistory('namespace-a');

    await act(async () => root.render(<Chat />));

    expect(
      container.querySelector('[data-testid="route-chat-page"]')
    ).toBeNull();
    expect(
      container.querySelector('[data-testid="copilot-view"]')
    ).not.toBeNull();
  });
});
