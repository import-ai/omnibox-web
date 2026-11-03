/** @jest-environment jsdom */

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import {
  beginChatSubmissionPreparation,
  useChatSubmissionStore,
} from '@/page/chat/chat-input/chatSubmissionStore';

import { getCopilotWorkspace, useCopilotStore } from './copilotStore';
import ExpandCopilotButton from './ExpandCopilotButton';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/components/omnibox/IconButton', () => ({
  IconButton: ({
    label,
    onClick,
    children,
    disabled,
  }: {
    label: string;
    onClick: () => void;
    children: ReactNode;
    disabled?: boolean;
  }) => (
    <button aria-label={label} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

describe('ExpandCopilotButton', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    sessionStorage.clear();
    useChatSubmissionStore.setState({ pending: {} });
    useCopilotStore.setState({ workspaces: {}, pendingExpandFromResource: {} });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.clearAllMocks();
  });

  it.each([
    ['home', '/namespace-a/chat'],
    ['history', '/namespace-a/chat/conversations'],
    ['conversation', '/namespace-a/chat/conversation-a'],
  ] as const)(
    'promotes %s without clearing panel state or drafts',
    async (view, path) => {
      const store = useCopilotStore.getState();
      store.showConversation('namespace-b', 'conversation-b');
      if (view === 'home') store.showHome('namespace-a');
      if (view === 'history') store.showHistory('namespace-a');
      if (view === 'conversation') {
        store.showConversation('namespace-a', 'conversation-a');
      }
      store.previewResource('namespace-a', 'resource-a');
      const workspace = getCopilotWorkspace(
        useCopilotStore.getState(),
        'namespace-a'
      );
      const otherWorkspace = getCopilotWorkspace(
        useCopilotStore.getState(),
        'namespace-b'
      );
      sessionStorage.setItem(
        'chat:input-draft:v2:home:namespace-a',
        'home draft'
      );
      sessionStorage.setItem(
        'chat:input-draft:v2:conversation-a',
        'conversation draft'
      );

      await act(async () =>
        root.render(<ExpandCopilotButton namespaceId="namespace-a" />)
      );
      const button = container.querySelector<HTMLButtonElement>('button');
      expect(button?.getAttribute('aria-label')).toBe('copilot.expand_view');
      expect(button?.querySelector('svg.lucide-maximize-2')).not.toBeNull();
      act(() => button?.click());

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(path);
      expect(useCopilotStore.getState().pendingExpandFromResource).toEqual({
        'namespace-a': true,
      });
      expect(
        getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
      ).toEqual(workspace);
      expect(
        getCopilotWorkspace(useCopilotStore.getState(), 'namespace-b')
      ).toEqual(otherWorkspace);
      expect(
        sessionStorage.getItem('chat:input-draft:v2:home:namespace-a')
      ).toBe('home draft');
      expect(sessionStorage.getItem('chat:input-draft:v2:conversation-a')).toBe(
        'conversation draft'
      );
    }
  );

  it('uses the visible conversation at click time, even after citation collapse', async () => {
    useCopilotStore
      .getState()
      .showConversation('namespace-a', 'old-conversation');
    await act(async () =>
      root.render(<ExpandCopilotButton namespaceId="namespace-a" />)
    );
    const store = useCopilotStore.getState();
    store.showConversation('namespace-a', 'visible-conversation');
    store.previewResource('namespace-a', 'resource-a');
    store.close('namespace-a');
    act(() => container.querySelector<HTMLButtonElement>('button')?.click());
    expect(mockNavigate).toHaveBeenCalledWith(
      '/namespace-a/chat/visible-conversation'
    );
    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
        .previewResourceId
    ).toBe('resource-a');
  });
  it('disables expansion while preparing and checks a same-event submission before navigating', async () => {
    useCopilotStore.getState().showHome('namespace-a');
    await act(async () =>
      root.render(<ExpandCopilotButton namespaceId="namespace-a" />)
    );
    const button = container.querySelector('button')!;
    let finish!: () => void;
    act(() => {
      finish = beginChatSubmissionPreparation(
        'namespace-a',
        'home:namespace-a'
      )!;
      button.click();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(button.disabled).toBe(true);
    act(() => finish());
    expect(button.disabled).toBe(false);
    act(() => button.click());
    expect(mockNavigate).toHaveBeenCalledWith('/namespace-a/chat');
  });
});
