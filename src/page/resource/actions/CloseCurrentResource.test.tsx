/** @jest-environment jsdom */

import { act, type ButtonHTMLAttributes } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import {
  getCopilotWorkspace,
  useCopilotStore,
} from '@/page/copilot/copilotStore';

import CloseCurrentResource from './CloseCurrentResource';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/components/ui/DropdownMenu', () => ({
  DropdownMenuItem: ({
    children,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('CloseCurrentResource', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useCopilotStore.setState({
      workspaces: {},
      pendingExpandFromResource: {},
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.clearAllMocks();
  });

  it('navigates to the expanded conversation without clearing preview first', async () => {
    const store = useCopilotStore.getState();
    store.showConversation('namespace-a', 'conversation-a');
    store.previewResource('namespace-a', 'Abcd1234Efgh5678');
    await act(async () =>
      root.render(<CloseCurrentResource namespaceId="namespace-a" />)
    );

    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    act(() => button?.click());

    expect(mockNavigate).toHaveBeenCalledWith(
      '/namespace-a/chat/conversation-a'
    );
    // Preview stays until Workspace sees the chat route, so the underlying
    // resource Outlet cannot flash between teardown and navigation.
    expect(useCopilotStore.getState().pendingExpandFromResource).toEqual({
      'namespace-a': true,
    });
    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
    ).toMatchObject({
      conversationId: 'conversation-a',
      open: true,
      previewResourceId: 'Abcd1234Efgh5678',
      view: 'conversation',
    });
  });
});
