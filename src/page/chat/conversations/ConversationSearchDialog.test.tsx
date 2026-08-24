/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { http } from '@/lib/request';

import ConversationSearchDialog from './ConversationSearchDialog';

const navigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'zh' },
    t: (key: string) =>
      ({
        'chat.conversations.noResults': '暂无匹配的消息',
        'chat.conversations.search': '搜索消息',
        'chat.conversations.messages': '消息',
        'chat.conversations.recent': '最近对话',
        'chat.conversations.roles.assistant': '小黑',
      })[key] || key,
  }),
}));

jest.mock('@/hooks/useUser', () => ({
  __esModule: true,
  default: () => ({ user: { username: '测试用户' } }),
}));

jest.mock('@/lib/request', () => ({
  http: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('@/components/search/SearchDialog', () => ({
  SearchDialog: ({
    children,
    onValueChange,
    placeholder,
    value,
  }: {
    children: React.ReactNode;
    onValueChange: (value: string) => void;
    placeholder: string;
    value: string;
  }) => (
    <div>
      <input
        aria-label="search"
        placeholder={placeholder}
        value={value}
        onChange={event => onValueChange(event.target.value)}
      />
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/Command', () => ({
  CommandGroup: ({
    children,
    heading,
  }: {
    children: React.ReactNode;
    heading: string;
  }) => (
    <section>
      <h2>{heading}</h2>
      {children}
    </section>
  ),
  CommandItem: ({
    children,
    onSelect,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
  }) => (
    <div role="option" onClick={onSelect}>
      {children}
    </div>
  ),
  CommandList: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock('@/components/ui/Spinner', () => ({ Spinner: () => null }));

jest.mock('@/page/search/SearchResultItem', () => ({
  SearchResultAnchor: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SearchResultContent: ({
    preview,
    title,
  }: {
    preview?: string;
    title: string;
  }) => (
    <div>
      <span>{title}</span>
      <span>{preview}</span>
    </div>
  ),
}));

jest.mock('@/page/search/SearchResultList', () => ({
  SearchNoResults: ({ label }: { label?: string }) => (
    <div>{label || 'no results'}</div>
  ),
}));

describe('ConversationSearchDialog', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = false;
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    window.history.replaceState(null, '', '/namespace/chat/conversations');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.useRealTimers();
  });

  it('shows recent conversations with the last message role and content', async () => {
    jest.mocked(http.get).mockResolvedValue({
      data: [
        {
          id: 'conversation-a',
          title: '最近的对话',
          last_message: { role: 'assistant', content: '最后一条回复' },
        },
      ],
    });

    await act(async () => {
      root.render(
        <ConversationSearchDialog
          namespaceId="namespace"
          open
          onOpenChange={jest.fn()}
        />
      );
    });

    expect(container.textContent).toContain('最近对话');
    expect(container.textContent).toContain('最近的对话');
    expect(container.textContent).toContain('小黑：最后一条回复');
    expect(
      container.querySelector('.min-h-0.flex-1')?.classList.contains('pt-2')
    ).toBe(false);
    expect(container.querySelector('input')?.getAttribute('placeholder')).toBe(
      '搜索消息'
    );
  });

  it('shows the message-specific empty state after searching', async () => {
    jest.mocked(http.get).mockResolvedValue({ data: [] });
    jest.mocked(http.post).mockResolvedValue({ items: [] });

    await act(async () => {
      root.render(
        <ConversationSearchDialog
          namespaceId="namespace"
          open
          onOpenChange={jest.fn()}
        />
      );
    });

    const input = container.querySelector('input')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
      )?.set?.call(input, '不存在');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(container.textContent).toContain('暂无匹配的消息');
  });

  it('opens the selected message result inside Copilot', async () => {
    const onConversationSelect = jest.fn();
    jest.mocked(http.get).mockResolvedValue({ data: [] });
    jest.mocked(http.post).mockResolvedValue({
      items: [
        {
          id: 'message-a',
          message_id: 'message-a',
          conversation_id: 'conversation-a',
          title: '命中的对话',
          role: 'user',
          content: '命中的消息',
        },
      ],
    });

    await act(async () => {
      root.render(
        <ConversationSearchDialog
          namespaceId="namespace"
          open
          onOpenChange={jest.fn()}
          onConversationSelect={onConversationSelect}
        />
      );
    });

    const input = container.querySelector('input')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
      )?.set?.call(input, '命中');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(container.textContent).toContain('命中的对话');
    await act(async () => {
      container.querySelector<HTMLElement>('[role="option"]')?.click();
    });

    expect(onConversationSelect).toHaveBeenCalledWith('conversation-a');
    expect(window.location.hash).toBe('#message-message-a');
  });
});
