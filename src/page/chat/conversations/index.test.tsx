/** @jest-environment jsdom */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import ChatConversationsPage from './index';

const onEdit = jest.fn();
const onRemove = jest.fn();
const onConversationSelect = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'zh' },
    t: (key: string) => key,
  }),
}));

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
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
    SidebarContent: Div,
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
    data: {
      total: 1,
      data: [
        {
          id: 'conversation-1',
          title: '美甲做做',
          user_content: '用户问题',
          assistant_content: '这里是助手预览，不应该出现在侧边栏',
          created_at: new Date().toISOString(),
        },
      ],
    },
    edit: { id: '', title: '', open: false },
    onEdit,
    remove: { id: '', title: '', open: false },
    current: 1,
    pageSize: 10,
    loading: false,
    accessDenied: false,
    onRemove,
    onEditDone: jest.fn(),
    namespaceId: 'space',
    onEditChange: jest.fn(),
    onRemoveDone: jest.fn(),
    onPagerChange: jest.fn(),
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
