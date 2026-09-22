/** @jest-environment jsdom */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import ChatConversationsPage from './index';

const onEdit = jest.fn();
const onRemove = jest.fn();
const onConversationSelect = jest.fn();
const onPagerChange = jest.fn();
const scrollIntoView = jest.fn();
const navigate = jest.fn();
let mockLocation: {
  pathname: string;
  state: { fromSidebar?: boolean } | null;
} = { pathname: '/space/chat/conversation-1', state: null };
let mockConversationId = 'conversation-1';
let observeIntersection:
  ((entries: { isIntersecting: boolean }[]) => void) | undefined;

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'zh' },
    t: (key: string) => key,
  }),
}));

jest.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useLocation: () => mockLocation,
}));

jest.mock('@/page/sidebar/sidebarScroll', () => ({
  centerSidebarElement: async () => {
    scrollIntoView({ behavior: 'auto', block: 'center' });
  },
}));

jest.mock('@/hooks/useIsTouch', () => ({
  useIsTouch: () => true,
}));

jest.mock('@/components/ui/Sidebar', () => {
  const Passthrough = ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  );
  const Div = ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>;
  return {
    SidebarContent: (props: React.HTMLAttributes<HTMLDivElement>) => (
      <Div {...props} data-sidebar="content" />
    ),
    SidebarMenu: Passthrough,
    SidebarMenuItem: Div,
    SidebarMenuButton: Passthrough,
    SidebarMenuAction: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <span className={className}>{children}</span>,
  };
});
jest.mock('@/components/ui/DropdownMenu', () => {
  const Passthrough = ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  );
  return {
    DropdownMenu: Passthrough,
    DropdownMenuContent: Passthrough,
    DropdownMenuTrigger: Passthrough,
    DropdownMenuItem: ({
      children,
      onClick,
    }: {
      children: React.ReactNode;
      onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    }) => <button onClick={onClick}>{children}</button>,
  };
});
jest.mock('@/page/chat/conversations/useContext', () => ({
  __esModule: true,
  default: () => ({
    list: {
      data: {
        total: 30,
        data: [
          {
            id: mockConversationId,
            title: '美甲做做',
            user_content: '用户问题',
            assistant_content: '这里是助手预览，不应该出现在侧边栏',
            created_at: new Date().toISOString(),
          },
        ],
      },
      current: 1,
      pageSize: 10,
      loading: false,
      hasMore: true,
      hasLoadError: false,
      accessDenied: false,
      onPagerChange,
      refetch: jest.fn(),
    },
    edit: { id: '', title: '', open: false },
    onEdit,
    remove: { id: '', title: '', open: false },
    onRemove,
    onEditDone: jest.fn(),
    namespaceId: 'space',
    onEditChange: jest.fn(),
    onRemoveDone: jest.fn(),
    onRemoveChange: jest.fn(),
  }),
}));

jest.mock('@/page/chat/conversations/edit', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/page/chat/conversations/RemoveHistory', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../utils', () => ({
  groupItemsByTimestamp: (items: Array<{ id: string }>) => [['今天', items]],
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

beforeEach(() => {
  jest.clearAllMocks();
  mockLocation = { pathname: '/space/chat/conversation-1', state: null };
  Object.assign(globalThis, { CSS: { escape: (value: string) => value } });
  mockConversationId = 'conversation-1';
  HTMLElement.prototype.scrollIntoView = scrollIntoView;
  Object.assign(globalThis, {
    IntersectionObserver: jest.fn(
      (callback: (entries: { isIntersecting: boolean }[]) => void) => {
        observeIntersection = callback;
        return { observe: jest.fn(), disconnect: jest.fn() };
      }
    ),
  });
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'IntersectionObserver');
});

it('renders compact conversations as title-only rows with resource menu icons', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        <ChatConversationsPage
          compact
          namespaceId="space"
          activeConversationId="conversation-1"
          onConversationSelect={onConversationSelect}
        />
      )
    );

    expect(container.textContent).toContain('美甲做做');
    expect(container.textContent).toContain('今天');
    expect(container.textContent).not.toContain(
      '这里是助手预览，不应该出现在侧边栏'
    );
    expect(container.querySelector('h1')).toBeNull();
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'center',
    });
    expect(container.textContent).not.toContain('pagination.prev');
    expect(container.textContent).not.toContain('pagination.next');
    if (!observeIntersection) {
      throw new Error('Conversation load-more observer is missing');
    }
    const intersect = observeIntersection;
    await act(async () => intersect([{ isIntersecting: true }]));
    expect(onPagerChange).toHaveBeenCalledWith(2);
    expect(container.querySelector('.lucide-message-circle')).not.toBeNull();
    expect(container.querySelector('.lucide-square-pen')).not.toBeNull();
    expect(container.querySelector('.lucide-trash-2')).not.toBeNull();

    const title = container.querySelector(
      '[data-conversation-id="conversation-1"]'
    );
    if (!(title instanceof HTMLElement)) {
      throw new Error('Conversation title is missing');
    }
    await act(async () => title.click());
    expect(onConversationSelect).toHaveBeenCalledWith('conversation-1');
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

it('loads more conversations until the linked conversation can be located', async () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const renderConversation = () =>
    root.render(
      <ChatConversationsPage
        compact
        namespaceId="space"
        activeConversationId="older-conversation"
      />
    );
  try {
    await act(async () => renderConversation());
    expect(onPagerChange).toHaveBeenCalledWith(2);
    expect(scrollIntoView).not.toHaveBeenCalled();

    mockConversationId = 'older-conversation';
    await act(async () => renderConversation());
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(onPagerChange).toHaveBeenCalledTimes(1);

    await act(async () => renderConversation());
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  } finally {
    await act(async () => root.unmount());
  }
});

it('keeps the clicked conversation in place and still locates later URL changes', async () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const renderConversation = async (activeConversationId?: string) => {
    await act(async () =>
      root.render(
        <ChatConversationsPage
          compact
          namespaceId="space"
          activeConversationId={activeConversationId}
          onConversationSelect={onConversationSelect}
        />
      )
    );
  };
  try {
    await renderConversation();
    const row = container.querySelector(
      '[data-conversation-id="conversation-1"]'
    );
    if (!(row instanceof HTMLElement)) {
      throw new Error('Conversation row is missing');
    }
    await act(async () => row.click());
    expect(onConversationSelect).toHaveBeenCalledWith('conversation-1');
    mockLocation = { ...mockLocation, state: { fromSidebar: true } };
    await renderConversation('conversation-1');
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(mockLocation.pathname, {
      replace: true,
      state: { fromSidebar: undefined },
    });
    mockLocation = { ...mockLocation, state: null };

    mockConversationId = 'conversation-2';
    await renderConversation('conversation-2');
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    mockConversationId = 'conversation-1';
    await renderConversation('conversation-1');
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  } finally {
    await act(async () => root.unmount());
  }
});

it('loads enough rows below the target to center it after reopening the page', async () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const renderConversation = async (activeConversationId?: string) => {
    await act(async () =>
      root.render(
        <ChatConversationsPage
          compact
          namespaceId="space"
          activeConversationId={activeConversationId}
        />
      )
    );
  };
  try {
    await renderConversation();
    const scrollContainer = container.querySelector('[data-sidebar="content"]');
    const row = container.querySelector(
      '[data-conversation-id="conversation-1"]'
    );
    if (
      !(scrollContainer instanceof HTMLElement) ||
      !(row instanceof HTMLElement)
    ) {
      throw new Error('Conversation scroll container or row is missing');
    }
    Object.defineProperty(scrollContainer, 'clientHeight', {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(scrollContainer, 'scrollHeight', {
      configurable: true,
      value: 600,
    });
    jest.spyOn(row, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 550,
      top: 550,
      left: 0,
      right: 240,
      bottom: 582,
      width: 240,
      height: 32,
      toJSON: () => ({}),
    });

    await renderConversation('conversation-1');
    expect(onPagerChange).toHaveBeenCalledWith(2);
    expect(scrollIntoView).not.toHaveBeenCalled();

    Object.defineProperty(scrollContainer, 'scrollHeight', {
      configurable: true,
      value: 1000,
    });
    await renderConversation('conversation-1');
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'center',
    });
    expect(onPagerChange).toHaveBeenCalledTimes(1);
  } finally {
    await act(async () => root.unmount());
  }
});
