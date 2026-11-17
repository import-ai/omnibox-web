/** @jest-environment jsdom */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import { useCopilotStore } from '@/page/copilot/copilotStore';

import {
  adjacentConversationId,
  clearDeletedConversationState,
  resolveAdjacentConversationId,
} from './conversationNavigation';
import ChatConversationsPage from './index';

jest.mock('@/lib/trackButtonClick', () => ({
  trackButtonClick: jest.fn(),
  onOverlayClose: () => jest.fn(),
}));

const onEdit = jest.fn();
const onRemove = jest.fn();
const onRemoveDone = jest.fn();
const onConversationSelect = jest.fn();
const onPagerChange = jest.fn();
const scrollIntoView = jest.fn();
const navigate = jest.fn();
let mockLocation: {
  key: string;
  pathname: string;
  state: { fromSidebar?: boolean } | null;
} = {
  key: 'initial',
  pathname: '/space/chat/conversation-1',
  state: null,
};
let mockConversationId = 'conversation-1';
let mockConversations:
  | Array<{
      id: string;
      title: string;
      user_content: string;
      assistant_content: string;
      created_at: string;
    }>
  | undefined;
let mockRemove = { id: '', title: '', open: false };
let observeIntersection:
  ((entries: { isIntersecting: boolean }[]) => void) | undefined;
let mockLoading = false;
let mockLoadingMore = false;

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
    SidebarGroupLabel: (props: React.HTMLAttributes<HTMLDivElement>) => (
      <Div {...props} data-sidebar="group-label" />
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
  default: (namespaceIdOverride?: string) => ({
    list: {
      data: {
        total: 30,
        data: mockConversations ?? [
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
      loading: mockLoading,
      loadingMore: mockLoadingMore,
      hasMore: true,
      hasLoadError: false,
      accessDenied: false,
      onPagerChange,
      refetch: jest.fn(),
      retry: jest.fn(),
    },
    edit: { id: '', title: '', open: false },
    onEdit,
    remove: mockRemove,
    onRemove,
    onEditDone: jest.fn(),
    namespaceId: namespaceIdOverride ?? 'space',
    onEditChange: jest.fn(),
    onRemoveDone,
    onRemoveChange: jest.fn(),
  }),
}));

jest.mock('@/page/chat/conversations/conversationNavigation', () => ({
  adjacentConversationId: jest.fn(),
  clearDeletedConversationState: jest.fn(),
  resolveAdjacentConversationId: jest.fn(),
}));

jest.mock('@/page/chat/conversations/edit', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/page/chat/conversations/RemoveHistory', () => ({
  __esModule: true,
  default: ({
    onFinish,
    onOpenChange,
  }: {
    onFinish: () => void;
    onOpenChange: (open: boolean) => void;
  }) => (
    <button
      data-testid="finish-remove"
      onClick={() => {
        onOpenChange(false);
        onFinish();
      }}
    />
  ),
}));

jest.mock('../utils', () => ({
  groupItemsByTimestamp: (items: Array<{ id: string }>) => [['今天', items]],
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(adjacentConversationId).mockReset();
  jest
    .mocked(resolveAdjacentConversationId)
    .mockReset()
    .mockResolvedValue(null);
  useCopilotStore.getState().reset('space');
  mockLocation = {
    key: 'initial',
    pathname: '/space/chat/conversation-1',
    state: null,
  };
  Object.assign(globalThis, { CSS: { escape: (value: string) => value } });
  mockConversationId = 'conversation-1';
  mockConversations = undefined;
  mockRemove = { id: '', title: '', open: false };
  mockLoading = false;
  mockLoadingMore = false;
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

    const dateLabel = Array.from(
      container.querySelectorAll('[data-sidebar="group-label"]')
    ).find(element => element.textContent === '今天');
    if (!(dateLabel instanceof HTMLElement)) {
      throw new Error('Conversation date label is missing');
    }
    expect(dateLabel.classList.contains('px-4')).toBe(true);

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

it('opens the next conversation after deleting the active sidebar conversation', async () => {
  jest
    .mocked(resolveAdjacentConversationId)
    .mockResolvedValue('conversation-2');
  mockRemove = { id: 'conversation-1', title: '美甲做做', open: true };
  useCopilotStore
    .getState()
    .showResourceBesideConversation('space', 'conversation-1', 'resource-1');
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        <ChatConversationsPage
          compact
          namespaceId="space"
          activeConversationId="conversation-1"
        />
      )
    );

    const remove = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent === 'chat.conversations.delete.option'
    );
    if (!(remove instanceof HTMLButtonElement)) {
      throw new Error('Conversation delete action is missing');
    }
    await act(async () => remove.click());

    const finish = container.querySelector('[data-testid="finish-remove"]');
    if (!(finish instanceof HTMLButtonElement)) {
      throw new Error('Delete success callback is missing');
    }
    await act(async () => finish.click());

    expect(resolveAdjacentConversationId).toHaveBeenCalledWith(
      'space',
      'conversation-1'
    );
    expect(onRemoveDone).toHaveBeenCalledTimes(1);
    expect(useCopilotStore.getState().workspaces.space).toBeUndefined();
    expect(navigate).toHaveBeenCalledWith('/space/chat/conversation-2', {
      state: { fromSidebar: true },
      flushSync: true,
    });
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

it('skips a pending target deleted before the active conversation deletion finishes', async () => {
  jest
    .mocked(adjacentConversationId)
    .mockReturnValueOnce('conversation-2')
    .mockReturnValueOnce('conversation-3')
    .mockReturnValueOnce('conversation-3');
  mockConversations = [
    {
      id: 'conversation-1',
      title: 'Route conversation',
      user_content: '',
      assistant_content: '',
      created_at: new Date().toISOString(),
    },
    {
      id: 'conversation-2',
      title: 'Concurrently deleted conversation',
      user_content: '',
      assistant_content: '',
      created_at: new Date().toISOString(),
    },
    {
      id: 'conversation-3',
      title: 'Remaining conversation',
      user_content: '',
      assistant_content: '',
      created_at: new Date().toISOString(),
    },
  ];
  const container = document.createElement('div');
  const root = createRoot(container);
  const renderPage = () =>
    root.render(
      <ChatConversationsPage
        compact
        namespaceId="space"
        activeConversationId="conversation-1"
      />
    );
  const clickDelete = async (conversationId: string) => {
    const conversation = container.querySelector(
      `[data-conversation-id="${conversationId}"]`
    );
    if (!(conversation instanceof HTMLElement)) {
      throw new Error(`Conversation ${conversationId} is missing`);
    }
    const remove = Array.from(
      conversation.parentElement?.querySelectorAll('button') ?? []
    ).find(button => button.textContent === 'chat.conversations.delete.option');
    if (!(remove instanceof HTMLButtonElement)) {
      throw new Error(`Delete action for ${conversationId} is missing`);
    }
    await act(async () => remove.click());
  };
  const finishDelete = async () => {
    const finish = container.querySelector('[data-testid="finish-remove"]');
    if (!(finish instanceof HTMLButtonElement)) {
      throw new Error('Delete success callback is missing');
    }
    await act(async () => finish.click());
  };
  try {
    await act(async () => renderPage());

    await clickDelete('conversation-1');
    mockRemove = {
      id: 'conversation-1',
      title: 'Route conversation',
      open: true,
    };
    await act(async () => renderPage());

    await clickDelete('conversation-2');
    mockConversations = mockConversations.filter(
      conversation => conversation.id !== 'conversation-2'
    );
    mockRemove = {
      id: 'conversation-2',
      title: 'Concurrently deleted conversation',
      open: true,
    };
    await act(async () => renderPage());
    await finishDelete();

    mockRemove = {
      id: 'conversation-1',
      title: 'Route conversation',
      open: true,
    };
    await act(async () => renderPage());
    await finishDelete();

    expect(navigate).toHaveBeenCalledWith('/space/chat/conversation-3', {
      state: { fromSidebar: true },
      flushSync: true,
    });
    expect(navigate).not.toHaveBeenCalledWith('/space/chat/conversation-2', {
      state: { fromSidebar: true },
      flushSync: true,
    });
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

it('opens the next split conversation in the normal layout', async () => {
  mockConversationId = 'conversation-2';
  mockRemove = {
    id: 'conversation-2',
    title: 'Split conversation',
    open: true,
  };
  jest
    .mocked(resolveAdjacentConversationId)
    .mockResolvedValue('conversation-3');
  useCopilotStore
    .getState()
    .showResourceBesideConversation('space', 'conversation-2', 'resource-1');
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        <ChatConversationsPage
          compact
          namespaceId="space"
          activeConversationId="conversation-1"
        />
      )
    );

    const remove = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent === 'chat.conversations.delete.option'
    );
    if (!(remove instanceof HTMLButtonElement)) {
      throw new Error('Conversation delete action is missing');
    }
    await act(async () => remove.click());

    const finish = container.querySelector('[data-testid="finish-remove"]');
    if (!(finish instanceof HTMLButtonElement)) {
      throw new Error('Delete success callback is missing');
    }
    await act(async () => finish.click());

    expect(resolveAdjacentConversationId).toHaveBeenCalledWith(
      'space',
      'conversation-2'
    );
    expect(useCopilotStore.getState().workspaces.space).toBeUndefined();
    expect(navigate).toHaveBeenCalledWith('/space/chat/conversation-3', {
      state: { fromSidebar: true },
      flushSync: true,
    });
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

it('does not navigate after the user leaves the deleted conversation context', async () => {
  let resolveNextConversation!: (value: string | null) => void;
  jest.mocked(resolveAdjacentConversationId).mockReturnValue(
    new Promise(resolve => {
      resolveNextConversation = resolve;
    })
  );
  mockRemove = { id: 'conversation-1', title: '美甲做做', open: true };
  const container = document.createElement('div');
  const root = createRoot(container);
  const renderConversation = (conversationId: string) =>
    root.render(
      <ChatConversationsPage
        compact
        namespaceId="space"
        activeConversationId={conversationId}
      />
    );
  try {
    await act(async () => renderConversation('conversation-1'));

    const remove = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent === 'chat.conversations.delete.option'
    );
    if (!(remove instanceof HTMLButtonElement)) {
      throw new Error('Conversation delete action is missing');
    }
    await act(async () => remove.click());

    mockLocation = {
      key: 'conversation-2',
      pathname: '/space/chat/conversation-2',
      state: null,
    };
    await act(async () => renderConversation('conversation-2'));

    const finish = container.querySelector('[data-testid="finish-remove"]');
    if (!(finish instanceof HTMLButtonElement)) {
      throw new Error('Delete success callback is missing');
    }
    await act(async () => finish.click());
    await act(async () => resolveNextConversation('conversation-2'));

    expect(clearDeletedConversationState).toHaveBeenCalledWith(
      'space',
      'conversation-1'
    );
    expect(onRemoveDone).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

it('leaves the deleted conversation when the user returns before navigation resolves', async () => {
  let resolveNextConversation!: (value: string | null) => void;
  jest.mocked(resolveAdjacentConversationId).mockReturnValue(
    new Promise(resolve => {
      resolveNextConversation = resolve;
    })
  );
  mockRemove = { id: 'conversation-1', title: '美甲做做', open: true };
  const container = document.createElement('div');
  const root = createRoot(container);
  const renderConversation = (conversationId: string) =>
    root.render(
      <ChatConversationsPage
        compact
        namespaceId="space"
        activeConversationId={conversationId}
      />
    );
  try {
    await act(async () => renderConversation('conversation-1'));

    const remove = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent === 'chat.conversations.delete.option'
    );
    if (!(remove instanceof HTMLButtonElement)) {
      throw new Error('Conversation delete action is missing');
    }
    await act(async () => remove.click());

    const finish = container.querySelector('[data-testid="finish-remove"]');
    if (!(finish instanceof HTMLButtonElement)) {
      throw new Error('Delete success callback is missing');
    }
    await act(async () => finish.click());

    mockLocation = {
      key: 'conversation-2',
      pathname: '/space/chat/conversation-2',
      state: null,
    };
    await act(async () => renderConversation('conversation-2'));
    mockLocation = {
      key: 'conversation-1-returned',
      pathname: '/space/chat/conversation-1',
      state: null,
    };
    await act(async () => renderConversation('conversation-1'));
    await act(async () => resolveNextConversation('conversation-2'));

    expect(navigate).toHaveBeenCalledWith('/space/chat/conversation-2', {
      state: { fromSidebar: true },
      flushSync: true,
    });
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

it('leaves a previously inactive conversation if it becomes current before deletion completes', async () => {
  jest.mocked(adjacentConversationId).mockReturnValue('conversation-2');
  mockConversations = [
    {
      id: 'conversation-1',
      title: 'First conversation',
      user_content: '',
      assistant_content: '',
      created_at: new Date().toISOString(),
    },
    {
      id: 'conversation-2',
      title: 'Second conversation',
      user_content: '',
      assistant_content: '',
      created_at: new Date().toISOString(),
    },
  ];
  mockRemove = {
    id: 'conversation-1',
    title: 'First conversation',
    open: true,
  };
  const container = document.createElement('div');
  const root = createRoot(container);
  const renderConversation = (conversationId: string) =>
    root.render(
      <ChatConversationsPage
        compact
        namespaceId="space"
        activeConversationId={conversationId}
      />
    );
  try {
    await act(async () => renderConversation('conversation-2'));

    const firstConversation = container.querySelector(
      '[data-conversation-id="conversation-1"]'
    );
    if (!(firstConversation instanceof HTMLElement)) {
      throw new Error('First conversation is missing');
    }
    const remove = Array.from(
      firstConversation.parentElement?.querySelectorAll('button') ?? []
    ).find(button => button.textContent === 'chat.conversations.delete.option');
    if (!(remove instanceof HTMLButtonElement)) {
      throw new Error('First conversation delete action is missing');
    }
    await act(async () => remove.click());

    mockLocation = {
      key: 'conversation-1',
      pathname: '/space/chat/conversation-1',
      state: null,
    };
    await act(async () => renderConversation('conversation-1'));

    const finish = container.querySelector('[data-testid="finish-remove"]');
    if (!(finish instanceof HTMLButtonElement)) {
      throw new Error('Delete success callback is missing');
    }
    await act(async () => finish.click());

    expect(navigate).toHaveBeenCalledWith('/space/chat/conversation-2', {
      state: { fromSidebar: true },
      flushSync: true,
    });
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

it('closes a deleted split conversation without overriding a later route', async () => {
  let resolveNextConversation!: (value: string | null) => void;
  jest.mocked(resolveAdjacentConversationId).mockReturnValue(
    new Promise(resolve => {
      resolveNextConversation = resolve;
    })
  );
  mockRemove = {
    id: 'conversation-2',
    title: 'Split conversation',
    open: true,
  };
  mockConversationId = 'conversation-2';
  useCopilotStore
    .getState()
    .showResourceBesideConversation('space', 'conversation-2', 'resource-1');
  const container = document.createElement('div');
  const root = createRoot(container);
  const renderConversation = (conversationId: string) =>
    root.render(
      <ChatConversationsPage
        compact
        namespaceId="space"
        activeConversationId={conversationId}
      />
    );
  try {
    await act(async () => renderConversation('conversation-1'));

    const remove = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent === 'chat.conversations.delete.option'
    );
    if (!(remove instanceof HTMLButtonElement)) {
      throw new Error('Conversation delete action is missing');
    }
    await act(async () => remove.click());

    const finish = container.querySelector('[data-testid="finish-remove"]');
    if (!(finish instanceof HTMLButtonElement)) {
      throw new Error('Delete success callback is missing');
    }
    await act(async () => finish.click());

    mockLocation = {
      key: 'conversation-3',
      pathname: '/space/chat/conversation-3',
      state: null,
    };
    await act(async () => renderConversation('conversation-3'));
    await act(async () => resolveNextConversation('conversation-3'));

    expect(navigate).not.toHaveBeenCalled();
    expect(useCopilotStore.getState().workspaces.space).toBeUndefined();
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

it('repairs the route when the hidden route conversation is deleted in split view', async () => {
  mockRemove = {
    id: 'conversation-1',
    title: 'Route conversation',
    open: true,
  };
  mockConversations = [
    {
      id: 'conversation-1',
      title: 'Route conversation',
      user_content: '',
      assistant_content: '',
      created_at: new Date().toISOString(),
    },
    {
      id: 'conversation-2',
      title: 'Split conversation',
      user_content: '',
      assistant_content: '',
      created_at: new Date().toISOString(),
    },
  ];
  useCopilotStore
    .getState()
    .showResourceBesideConversation('space', 'conversation-2', 'resource-1');
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        <ChatConversationsPage
          compact
          namespaceId="space"
          activeConversationId="conversation-1"
        />
      )
    );

    const routeConversation = container.querySelector(
      '[data-conversation-id="conversation-1"]'
    );
    if (!(routeConversation instanceof HTMLElement)) {
      throw new Error('Route conversation is missing');
    }
    const remove = Array.from(
      routeConversation.parentElement?.querySelectorAll('button') ?? []
    ).find(button => button.textContent === 'chat.conversations.delete.option');
    if (!(remove instanceof HTMLButtonElement)) {
      throw new Error('Route conversation delete action is missing');
    }
    await act(async () => remove.click());

    const finish = container.querySelector('[data-testid="finish-remove"]');
    if (!(finish instanceof HTMLButtonElement)) {
      throw new Error('Delete success callback is missing');
    }
    await act(async () => finish.click());

    expect(navigate).toHaveBeenCalledWith('/space/chat/conversation-2', {
      flushSync: true,
    });
    expect(useCopilotStore.getState().workspaces.space).toBeDefined();
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

it('highlights the conversation actually displayed in split view', async () => {
  mockConversations = [
    {
      id: 'conversation-1',
      title: 'Route conversation',
      user_content: '',
      assistant_content: '',
      created_at: new Date().toISOString(),
    },
    {
      id: 'conversation-2',
      title: 'Split conversation',
      user_content: '',
      assistant_content: '',
      created_at: new Date().toISOString(),
    },
  ];
  useCopilotStore
    .getState()
    .showResourceBesideConversation('space', 'conversation-2', 'resource-1');
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        <ChatConversationsPage
          compact
          namespaceId="space"
          activeConversationId="conversation-1"
        />
      )
    );

    const routeConversation = container.querySelector(
      '[data-conversation-id="conversation-1"]'
    );
    const splitConversation = container.querySelector(
      '[data-conversation-id="conversation-2"]'
    );
    if (
      !(routeConversation instanceof HTMLElement) ||
      !(splitConversation instanceof HTMLElement)
    ) {
      throw new Error('Conversation rows are missing');
    }
    expect(
      routeConversation.parentElement?.classList.contains('bg-sidebar-accent')
    ).toBe(false);
    expect(
      splitConversation.parentElement?.classList.contains('bg-sidebar-accent')
    ).toBe(true);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

it('opens chat home after deleting the only active sidebar conversation', async () => {
  jest.mocked(resolveAdjacentConversationId).mockResolvedValue(null);
  mockRemove = { id: 'conversation-1', title: '美甲做做', open: true };
  useCopilotStore
    .getState()
    .showResourceBesideConversation('space', 'conversation-1', 'resource-1');
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        <ChatConversationsPage
          compact
          namespaceId="space"
          activeConversationId="conversation-1"
        />
      )
    );

    const remove = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent === 'chat.conversations.delete.option'
    );
    if (!(remove instanceof HTMLButtonElement)) {
      throw new Error('Conversation delete action is missing');
    }
    await act(async () => remove.click());

    const finish = container.querySelector('[data-testid="finish-remove"]');
    if (!(finish instanceof HTMLButtonElement)) {
      throw new Error('Delete success callback is missing');
    }
    await act(async () => finish.click());

    expect(useCopilotStore.getState().workspaces.space).toBeUndefined();
    expect(navigate).toHaveBeenCalledWith('/space/chat', {
      state: { fromSidebar: true },
      flushSync: true,
    });
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

it('clears a deleted non-active conversation without navigating', async () => {
  mockRemove = { id: 'conversation-2', title: '另一个对话', open: true };
  useCopilotStore
    .getState()
    .showResourceBesideConversation('space', 'conversation-1', 'resource-1');
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        <ChatConversationsPage
          compact
          namespaceId="space"
          activeConversationId="conversation-1"
        />
      )
    );

    const finish = container.querySelector('[data-testid="finish-remove"]');
    if (!(finish instanceof HTMLButtonElement)) {
      throw new Error('Delete success callback is missing');
    }
    await act(async () => finish.click());

    expect(clearDeletedConversationState).toHaveBeenCalledWith(
      'space',
      'conversation-2'
    );
    expect(onRemoveDone).toHaveBeenCalledTimes(1);
    expect(useCopilotStore.getState().workspaces.space).toBeDefined();
    expect(navigate).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

it('highlights the route conversation when Copilot is closed with a preview retained', async () => {
  mockConversations = [
    {
      id: 'conversation-1',
      title: 'Route conversation',
      user_content: '',
      assistant_content: '',
      created_at: new Date().toISOString(),
    },
    {
      id: 'conversation-2',
      title: 'Split conversation',
      user_content: '',
      assistant_content: '',
      created_at: new Date().toISOString(),
    },
  ];
  useCopilotStore.getState().showConversation('space', 'conversation-2');
  useCopilotStore.getState().close('space');
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        <ChatConversationsPage
          compact
          namespaceId="space"
          activeConversationId="conversation-1"
        />
      )
    );

    const routeConversation = container.querySelector(
      '[data-conversation-id="conversation-1"]'
    );
    const splitConversation = container.querySelector(
      '[data-conversation-id="conversation-2"]'
    );
    if (
      !(routeConversation instanceof HTMLElement) ||
      !(splitConversation instanceof HTMLElement)
    ) {
      throw new Error('Conversation rows are missing');
    }
    expect(
      routeConversation.parentElement?.classList.contains('bg-sidebar-accent')
    ).toBe(true);
    expect(
      splitConversation.parentElement?.classList.contains('bg-sidebar-accent')
    ).toBe(false);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

it('clears a hidden Copilot conversation when it is deleted while closed', async () => {
  jest.mocked(resolveAdjacentConversationId).mockResolvedValue(null);
  mockRemove = {
    id: 'conversation-2',
    title: 'Hidden split conversation',
    open: true,
  };
  mockConversations = [
    {
      id: 'conversation-1',
      title: 'Route conversation',
      user_content: '',
      assistant_content: '',
      created_at: new Date().toISOString(),
    },
    {
      id: 'conversation-2',
      title: 'Hidden split conversation',
      user_content: '',
      assistant_content: '',
      created_at: new Date().toISOString(),
    },
  ];
  useCopilotStore
    .getState()
    .showResourceBesideConversation('space', 'conversation-2', 'resource-1');
  useCopilotStore.getState().close('space');
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        <ChatConversationsPage
          compact
          namespaceId="space"
          activeConversationId="conversation-1"
        />
      )
    );

    const hiddenConversation = container.querySelector(
      '[data-conversation-id="conversation-2"]'
    );
    if (!(hiddenConversation instanceof HTMLElement)) {
      throw new Error('Hidden conversation is missing');
    }
    const remove = Array.from(
      hiddenConversation.parentElement?.querySelectorAll('button') ?? []
    ).find(button => button.textContent === 'chat.conversations.delete.option');
    if (!(remove instanceof HTMLButtonElement)) {
      throw new Error('Hidden conversation delete action is missing');
    }
    await act(async () => remove.click());

    const finish = container.querySelector('[data-testid="finish-remove"]');
    if (!(finish instanceof HTMLButtonElement)) {
      throw new Error('Delete success callback is missing');
    }
    await act(async () => finish.click());

    expect(onRemoveDone).toHaveBeenCalledWith('conversation-2');
    expect(useCopilotStore.getState().workspaces.space).toBeUndefined();
    expect(navigate).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

it('clears the deletion namespace captured before switching spaces', async () => {
  mockRemove = {
    id: 'conversation-1',
    title: 'Route conversation',
    open: true,
  };
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        <ChatConversationsPage
          compact
          namespaceId="space"
          activeConversationId="conversation-1"
        />
      )
    );

    const remove = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent === 'chat.conversations.delete.option'
    );
    if (!(remove instanceof HTMLButtonElement)) {
      throw new Error('Conversation delete action is missing');
    }
    await act(async () => remove.click());

    mockLocation = {
      key: 'other-space',
      pathname: '/other/chat/conversation-other',
      state: null,
    };
    await act(async () =>
      root.render(
        <ChatConversationsPage
          compact
          namespaceId="other"
          activeConversationId="conversation-other"
        />
      )
    );

    const finish = container.querySelector('[data-testid="finish-remove"]');
    if (!(finish instanceof HTMLButtonElement)) {
      throw new Error('Delete success callback is missing');
    }
    await act(async () => finish.click());

    expect(clearDeletedConversationState).toHaveBeenCalledWith(
      'space',
      'conversation-1'
    );
    expect(onRemoveDone).toHaveBeenCalledWith('conversation-1');
    expect(navigate).not.toHaveBeenCalled();
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

it('shows the footer spinner only while loading another page', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const renderList = async (loading: boolean, loadingMore: boolean) => {
    mockLoading = loading;
    mockLoadingMore = loadingMore;
    await act(async () =>
      root.render(
        <ChatConversationsPage
          compact
          namespaceId="space"
          activeConversationId="conversation-1"
        />
      )
    );
  };
  try {
    await renderList(true, false);
    expect(container.querySelector('[role="status"]')).toBeNull();
    await renderList(true, true);
    expect(container.querySelector('[role="status"]')).not.toBeNull();
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
