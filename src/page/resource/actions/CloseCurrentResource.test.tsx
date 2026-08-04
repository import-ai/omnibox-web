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

  it('closes the panel and expands the active conversation', async () => {
    useCopilotStore
      .getState()
      .showConversation('namespace-a', 'conversation-a');
    await act(async () =>
      root.render(<CloseCurrentResource namespaceId="namespace-a" />)
    );

    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    act(() => button?.click());

    expect(mockNavigate).toHaveBeenCalledWith(
      '/namespace-a/chat/conversation-a'
    );
    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
    ).toMatchObject({
      conversationId: 'conversation-a',
      open: false,
      view: 'conversation',
    });
  });
});
