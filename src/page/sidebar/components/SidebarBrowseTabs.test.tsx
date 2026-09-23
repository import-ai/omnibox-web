/** @jest-environment jsdom */
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { SidebarBrowseTabs } from './SidebarBrowseTabs';

const mockDeselectAll = jest.fn();

jest.mock('../store', () => ({
  useSidebarStore: (
    selector: (state: { deselectAll: () => void }) => unknown
  ) => selector({ deselectAll: mockDeselectAll }),
}));

jest.mock('react', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  return { ...react, default: react };
});
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/components/loading', () => ({
  __esModule: true,
  default: () => <span>Loading</span>,
}));
jest.mock('@/components/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipContent: () => null,
}));
jest.mock('@/components/ui/Button', () => ({
  Button: ({
    children,
    onClick,
    'aria-label': ariaLabel,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    'aria-label'?: string;
  }) => (
    <button aria-label={ariaLabel} onClick={onClick}>
      {children}
    </button>
  ),
}));
jest.mock('@/page/chat/conversations', () => ({
  __esModule: true,
  default: ({
    namespaceId,
    onConversationSelect,
  }: {
    namespaceId: string;
    onConversationSelect: (id: string) => void;
  }) => (
    <button onClick={() => onConversationSelect('conversation-1')}>
      {namespaceId}
    </button>
  ),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

beforeEach(() => {
  localStorage.clear();
  mockDeselectAll.mockClear();
});

function ResourceProbe() {
  const [expanded, setExpanded] = useState(false);
  const handleExpand = () => setExpanded(true);
  return (
    <button onClick={handleExpand}>
      {expanded ? 'Expanded' : 'Collapsed'}
    </button>
  );
}

it('switches sidebar panels without resetting resources and forwards conversation selection', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const onSelect = jest.fn();
  const onSearchConversations = jest.fn();
  const onNewConversation = jest.fn();
  try {
    await act(async () =>
      root.render(
        <SidebarBrowseTabs
          namespaceId="space"
          onConversationSelect={onSelect}
          onSearchConversations={onSearchConversations}
          onNewConversation={onNewConversation}
        >
          <ResourceProbe />
        </SidebarBrowseTabs>
      )
    );
    const resourceTab = container.querySelector(
      '[role="tab"][data-state="active"]'
    );
    const chatTab = container.querySelector(
      '[role="tab"][data-state="inactive"]'
    );
    const resourceButton = container.querySelector('[role="tabpanel"] button');
    if (
      !(resourceButton instanceof HTMLButtonElement) ||
      !chatTab ||
      !resourceTab
    ) {
      throw new Error('Sidebar controls are missing');
    }
    await act(async () => resourceButton.click());
    expect(mockDeselectAll).not.toHaveBeenCalled();
    await act(async () =>
      chatTab.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, button: 0 })
      )
    );
    expect(chatTab.getAttribute('aria-selected')).toBe('true');
    expect(mockDeselectAll).toHaveBeenCalledTimes(1);
    expect(resourceButton.textContent).toBe('Expanded');
    expect(
      resourceButton.closest('[role="tabpanel"]')?.getAttribute('data-state')
    ).toBe('inactive');
    const conversationButton = container.querySelector(
      '[role="tabpanel"][data-state="active"] button'
    );
    if (!(conversationButton instanceof HTMLButtonElement)) {
      throw new Error('Conversation control is missing');
    }
    await act(async () => conversationButton.click());
    expect(onSelect).toHaveBeenCalledWith('conversation-1');
    await act(async () =>
      resourceTab.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, button: 0 })
      )
    );
    expect(resourceTab.getAttribute('aria-selected')).toBe('true');
    expect(mockDeselectAll).toHaveBeenCalledTimes(2);
    expect(resourceButton.textContent).toBe('Expanded');
    await act(async () =>
      chatTab.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, button: 0 })
      )
    );
    expect(
      container.querySelector('[role="tabpanel"][data-state="active"] button')
    ).toBe(conversationButton);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

it('restores both tabs after remounting and isolates workspace and account preferences', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const onAction = jest.fn();
  const renderSidebar = async (key: string, namespaceId = 'space') => {
    await act(async () =>
      root.render(
        <SidebarBrowseTabs
          key={key}
          namespaceId={namespaceId}
          onConversationSelect={onAction}
          onSearchConversations={onAction}
          onNewConversation={onAction}
        >
          <ResourceProbe />
        </SidebarBrowseTabs>
      )
    );
  };
  const selectTab = async (name: string) => {
    const tab = Array.from(container.querySelectorAll('[role="tab"]')).find(
      element => element.textContent === name
    );
    if (!tab) {
      throw new Error(`Missing sidebar tab: ${name}`);
    }
    await act(async () =>
      tab.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, button: 0 })
      )
    );
  };
  const selectedTab = () =>
    container.querySelector('[role="tab"][aria-selected="true"]')?.textContent;

  try {
    localStorage.setItem('uid', 'user-1');
    await renderSidebar('initial');
    await selectTab('search.chats');
    await renderSidebar('refresh');
    expect(selectedTab()).toBe('search.chats');
    expect(
      container.querySelector('[role="tabpanel"][data-state="active"] button')
        ?.textContent
    ).toBe('space');
    expect(mockDeselectAll).toHaveBeenCalledTimes(1);

    await renderSidebar('other-space', 'other-space');
    expect(selectedTab()).toBe('search.resources');
    await renderSidebar('return');
    expect(selectedTab()).toBe('search.chats');

    localStorage.setItem('uid', 'user-2');
    await renderSidebar('other-user');
    expect(selectedTab()).toBe('search.resources');
    localStorage.setItem('uid', 'user-1');
    await renderSidebar('original-user');
    expect(selectedTab()).toBe('search.chats');

    await selectTab('search.resources');
    await renderSidebar('refresh-resources');
    expect(selectedTab()).toBe('search.resources');
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

it('opens conversation search and new chat from the chat toolbar', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const onSearchConversations = jest.fn();
  const onNewConversation = jest.fn();
  try {
    await act(async () =>
      root.render(
        <SidebarBrowseTabs
          namespaceId="space"
          onConversationSelect={jest.fn()}
          onSearchConversations={onSearchConversations}
          onNewConversation={onNewConversation}
        >
          <ResourceProbe />
        </SidebarBrowseTabs>
      )
    );
    const chatTab = container.querySelector(
      '[role="tab"][data-state="inactive"]'
    );
    if (!chatTab) {
      throw new Error('Chat tab is missing');
    }
    await act(async () =>
      chatTab.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, button: 0 })
      )
    );
    const searchButton = container.querySelector(
      'button[aria-label="search.search_chats"]'
    );
    const newChatButton = container.querySelector(
      'button[aria-label="chat.conversations.new_chat"]'
    );
    if (
      !(searchButton instanceof HTMLButtonElement) ||
      !(newChatButton instanceof HTMLButtonElement)
    ) {
      throw new Error('Chat toolbar buttons are missing');
    }
    await act(async () => searchButton.click());
    await act(async () => newChatButton.click());
    expect(onSearchConversations).toHaveBeenCalledTimes(1);
    expect(onNewConversation).toHaveBeenCalledTimes(1);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

it.each([
  {
    activeResourceId: 'resource-1',
    activeConversationId: undefined,
    saved: 'chats',
    expected: 'search.resources',
  },
  {
    activeResourceId: undefined,
    activeConversationId: 'conversation-1',
    saved: 'resources',
    expected: 'search.chats',
  },
])(
  'opens the linked item tab instead of the saved $saved tab',
  async ({ activeResourceId, activeConversationId, saved, expected }) => {
    localStorage.setItem('sidebar-browse-tab:[null,"space"]', saved);
    const container = document.createElement('div');
    const root = createRoot(container);
    try {
      await act(async () =>
        root.render(
          <SidebarBrowseTabs
            namespaceId="space"
            activeResourceId={activeResourceId}
            activeConversationId={activeConversationId}
            onConversationSelect={jest.fn()}
            onSearchConversations={jest.fn()}
            onNewConversation={jest.fn()}
          >
            <ResourceProbe />
          </SidebarBrowseTabs>
        )
      );
      expect(
        container.querySelector('[role="tab"][aria-selected="true"]')
          ?.textContent
      ).toBe(expected);
    } finally {
      await act(async () => root.unmount());
    }
  }
);

it('follows resource and conversation URL changes while allowing manual tab browsing', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const renderRoute = async (
    activeResourceId?: string,
    activeConversationId?: string
  ) => {
    await act(async () =>
      root.render(
        <SidebarBrowseTabs
          namespaceId="space"
          activeResourceId={activeResourceId}
          activeConversationId={activeConversationId}
          onConversationSelect={jest.fn()}
          onSearchConversations={jest.fn()}
          onNewConversation={jest.fn()}
        >
          <ResourceProbe />
        </SidebarBrowseTabs>
      )
    );
  };
  const selectedTab = () =>
    container.querySelector('[role="tab"][aria-selected="true"]')?.textContent;
  try {
    await renderRoute('resource-1');
    expect(selectedTab()).toBe('search.resources');
    await renderRoute(undefined, 'conversation-1');
    expect(selectedTab()).toBe('search.chats');

    const resourceTab = Array.from(
      container.querySelectorAll('[role="tab"]')
    ).find(tab => tab.textContent === 'search.resources');
    if (!resourceTab) {
      throw new Error('Resource tab is missing');
    }
    await act(async () =>
      resourceTab.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, button: 0 })
      )
    );
    await renderRoute(undefined, 'conversation-1');
    expect(selectedTab()).toBe('search.resources');

    await renderRoute(undefined, 'conversation-2');
    expect(selectedTab()).toBe('search.chats');
    await renderRoute('resource-1');
    expect(selectedTab()).toBe('search.resources');
    await renderRoute(undefined, 'conversation-2');
    expect(selectedTab()).toBe('search.chats');
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
