/** @jest-environment jsdom */

import { act, type ReactNode } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import {
  clearConversationCache,
  setCachedConversation,
} from '@/page/chat/conversation/conversationCache';

import { useChatTitle } from './useChatTitle';

const listeners = new Map<string, Array<(...args: unknown[]) => void>>();

const mockApp = {
  on: (id: string, callback: (...args: unknown[]) => void) => {
    const list = listeners.get(id) ?? [];
    list.push(callback);
    listeners.set(id, list);
    return () => {
      const next = (listeners.get(id) ?? []).filter(item => item !== callback);
      listeners.set(id, next);
    };
  },
  fire: (id: string, ...args: unknown[]) => {
    (listeners.get(id) ?? []).forEach(callback => callback(...args));
  },
};

const mockPost = jest.fn();
const cacheScope = { userId: 'user-a', namespaceId: 'namespace-a' };

jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => mockApp,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh' },
  }),
}));

jest.mock('@/lib/request', () => ({
  http: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

jest.mock('@/lib/wizardLang', () => ({
  getWizardLang: () => 'zh',
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function HookProbe({
  namespaceId,
  conversationId,
  onTitle,
}: {
  namespaceId: string;
  conversationId: string;
  onTitle: (title: string) => void;
}) {
  const { chatTitle } = useChatTitle(namespaceId, conversationId);
  onTitle(chatTitle);
  return null;
}

describe('useChatTitle', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latestTitle = '';
  let renderedTitles: string[] = [];

  beforeEach(() => {
    listeners.clear();
    localStorage.setItem('uid', 'user-a');
    mockPost.mockReset();
    mockPost.mockResolvedValue({ title: 'Generated title' });
    clearConversationCache();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latestTitle = '';
    renderedTitles = [];
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const renderHook = async (conversationId: string) => {
    await act(async () => {
      root.render(
        (
          <HookProbe
            namespaceId="namespace-a"
            conversationId={conversationId}
            onTitle={title => {
              latestTitle = title;
              renderedTitles.push(title);
            }}
          />
        ) as ReactNode
      );
    });
  };

  it('hydrates from conversation cache', async () => {
    setCachedConversation(cacheScope, {
      id: 'conversation-a',
      title: 'Cached title',
      mapping: {},
    });
    await renderHook('conversation-a');
    expect(latestTitle).toBe('Cached title');
  });

  it('applies title updates only for the active conversation', async () => {
    await renderHook('conversation-a');
    await act(async () => {
      mockApp.fire('chat:title:update', {
        conversationId: 'conversation-b',
        title: 'Other',
      });
    });
    expect(latestTitle).toBe('');

    await act(async () => {
      mockApp.fire('chat:title:update', {
        conversationId: 'conversation-a',
        title: 'Mine',
      });
    });
    expect(latestTitle).toBe('Mine');
  });

  it('posts title generation for untitled conversations', async () => {
    const onRefresh = jest.fn();
    mockApp.on('chat:conversation:title-generated', onRefresh);
    setCachedConversation(cacheScope, {
      id: 'conversation-a',
      created_at: '2026-10-12T01:00:00Z',
      mapping: {},
    });
    await renderHook('conversation-a');
    await act(async () => {
      mockApp.fire('chat:title', {
        conversationId: 'conversation-a',
        text: 'Hello world',
      });
    });

    expect(mockPost).toHaveBeenCalledWith(
      '/namespaces/namespace-a/conversations/conversation-a/title',
      { text: 'Hello world', lang: 'zh' }
    );
    await act(async () => undefined);
    expect(latestTitle).toBe('Generated title');
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onRefresh).toHaveBeenCalledWith({
      userId: 'user-a',
      namespaceId: 'namespace-a',
      conversation: {
        id: 'conversation-a',
        title: 'Generated title',
        created_at: '2026-10-12T01:00:00Z',
      },
    });
  });

  it('still generates a title after the header shows the first message', async () => {
    await renderHook('conversation-a');
    await act(async () => {
      mockApp.fire('chat:title:update', {
        conversationId: 'conversation-a',
        title: '你好',
      });
    });
    expect(latestTitle).toBe('你好');
    await act(async () => {
      mockApp.fire('chat:title', {
        conversationId: 'conversation-a',
        text: '你好',
      });
    });
    expect(mockPost).toHaveBeenCalledWith(
      '/namespaces/namespace-a/conversations/conversation-a/title',
      { text: '你好', lang: 'zh' }
    );
  });

  it('does not replace a title the user already set', async () => {
    await renderHook('conversation-a');
    await act(async () => {
      mockApp.fire('chat:title:update', {
        conversationId: 'conversation-a',
        title: '手改标题',
      });
    });
    await act(async () => {
      mockApp.fire('chat:title', {
        conversationId: 'conversation-a',
        text: '你好',
      });
    });
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('ignores title generation for another conversation', async () => {
    await renderHook('conversation-a');
    await act(async () => {
      mockApp.fire('chat:title', {
        conversationId: 'conversation-b',
        text: 'Hello world',
      });
    });
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('does not render the previous title while switching conversations', async () => {
    setCachedConversation(cacheScope, {
      id: 'conversation-a',
      title: 'Conversation A',
      mapping: {},
    });
    await renderHook('conversation-a');

    const switchRenderStart = renderedTitles.length;
    await renderHook('conversation-b');

    expect(renderedTitles.slice(switchRenderStart)).not.toContain(
      'Conversation A'
    );
    expect(latestTitle).toBe('');
  });

  it('does not apply a generated title after switching conversations', async () => {
    const onRefresh = jest.fn();
    mockApp.on('chat:conversation:title-generated', onRefresh);
    let resolveTitle!: (value: { title: string }) => void;
    mockPost.mockReturnValueOnce(
      new Promise(resolve => {
        resolveTitle = resolve;
      })
    );
    await renderHook('conversation-a');

    await act(async () => {
      mockApp.fire('chat:title', {
        conversationId: 'conversation-a',
        text: 'Hello from A',
      });
    });
    await renderHook('conversation-b');
    await act(async () => {
      resolveTitle({ title: 'Generated A' });
      await Promise.resolve();
    });

    expect(latestTitle).toBe('');
    expect(onRefresh).toHaveBeenCalledWith({
      userId: 'user-a',
      namespaceId: 'namespace-a',
      conversation: { id: 'conversation-a', title: 'Generated A' },
    });
  });

  it('clears the active title when conversation authorization fails', async () => {
    setCachedConversation(cacheScope, {
      id: 'conversation-a',
      title: 'User A secret',
      mapping: {},
    });
    await renderHook('conversation-a');
    expect(latestTitle).toBe('User A secret');

    await act(async () => {
      mockApp.fire('chat:title:clear', { conversationId: 'conversation-a' });
    });

    expect(latestTitle).toBe('');
  });
});
