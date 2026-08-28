/** @jest-environment jsdom */

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import useApp from '@/hooks/useApp';
import { CONVERSATION_SHARE_STATE_EVENT } from '@/page/chat/share/conversationShareEvents';

import ChatHeader from './index';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/space/chat/conversation-1' }),
  useParams: () => ({
    conversation_id: 'conversation-1',
    namespace_id: 'space',
  }),
}));
jest.mock('@/hooks/useApp');
jest.mock('@/components/ui/Breadcrumb', () => ({
  Breadcrumb: ({ children }: { children: ReactNode }) => <nav>{children}</nav>,
  BreadcrumbItem: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  BreadcrumbList: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));
jest.mock('@/lib/utils', () => ({
  setDocumentTitle: jest.fn(),
}));
jest.mock('@/page/chat/conversations/ConversationSearchDialog', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/page/copilot/CopilotToggleButton', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/page/copilot/copilotStore', () => ({
  getCopilotWorkspace: () => ({ open: false, view: 'conversation' }),
  useCopilotStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      pendingExpandFromResource: {},
      showConversation: jest.fn(),
      showHistory: jest.fn(),
      showHome: jest.fn(),
    }),
}));
jest.mock('./Actions', () => ({
  __esModule: true,
  default: () => <div>header-actions</div>,
}));
jest.mock('./title', () => ({
  __esModule: true,
  default: ({ data }: { data: string }) => <span>{data}</span>,
}));
jest.mock('./useChatTitle', () => ({
  useChatTitle: () => ({ chatTitle: '对话标题' }),
}));
jest.mock('@/components/SidebarTriggerButton', () => ({
  SidebarTriggerButton: () => <div>sidebar-trigger</div>,
}));

describe('ChatHeader share selection state', () => {
  let container: HTMLDivElement;
  let root: Root;
  let listeners: Map<string, (payload: unknown) => void>;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    root = createRoot(container);
    listeners = new Map();
    jest.mocked(useApp).mockReturnValue({
      fire: (event: string, payload: unknown) =>
        listeners.get(event)?.(payload),
      on: (event: string, listener: (payload: unknown) => void) => {
        listeners.set(event, listener);
        return () => listeners.delete(event);
      },
    } as ReturnType<typeof useApp>);
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it('keeps the conversation title and removes top actions while selecting', () => {
    act(() => {
      root.render(<ChatHeader />);
    });

    expect(container.textContent).toContain('header-actions');
    const originalHeaderClass = container.querySelector('header')?.className;

    act(() => {
      listeners.get(CONVERSATION_SHARE_STATE_EVENT)?.({
        conversationId: 'conversation-1',
        isSelecting: true,
      });
    });

    expect(container.textContent).toContain('对话标题');
    expect(container.textContent).toContain('sidebar-trigger');
    expect(container.textContent).not.toContain('header-actions');
    expect(container.textContent).not.toContain('chat.share.selectAll');
    expect(container.querySelector('header')?.className).toBe(
      originalHeaderClass
    );
  });
});
