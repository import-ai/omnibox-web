/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import AppContext from '@/hooks/appContext';
import Hook from '@/hooks/hook.class';
import { addToChatContext, openCopilotForChatContext } from '@/lib/chatBridge';
import { useChatStore } from '@/page/chat/chatStore';
import {
  ResourceCommentsProvider,
  useResourceCommentsPanel,
} from '@/page/resource/comments/ResourceCommentsContext';

import CopilotPanel from './CopilotPanel';
import { getCopilotWorkspace, useCopilotStore } from './copilotStore';

let copilotViewMounts = 0;
let resizeCallback: ResizeObserverCallback;

jest.mock('lodash-es', () => ({
  isFunction: (value: unknown) => typeof value === 'function',
  isString: (value: unknown) => typeof value === 'string',
  isUndefined: (value: unknown) => value === undefined,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/page/chat/header/Actions', () => ({
  __esModule: true,
  default: () => <button type="button">actions</button>,
}));

jest.mock('@/page/chat/conversations/ConversationSearchDialog', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/page/chat/header/title', () => ({
  __esModule: true,
  default: ({ data }: { data: string }) => (
    <span data-testid="copilot-title">{data}</span>
  ),
}));

jest.mock('@/page/chat/header/useChatTitle', () => ({
  useChatTitle: () => ({ chatTitle: 'Panel title', i18nTitle: 'New' }),
}));

jest.mock('@/components/ui/Breadcrumb', () => ({
  Breadcrumb: ({ children }: { children: React.ReactNode }) => (
    <nav>{children}</nav>
  ),
  BreadcrumbList: ({ children }: { children: React.ReactNode }) => (
    <ol>{children}</ol>
  ),
  BreadcrumbItem: ({ children }: { children: React.ReactNode }) => (
    <li>{children}</li>
  ),
}));

jest.mock('./CopilotToggleButton', () => ({
  __esModule: true,
  default: () => <button type="button">toggle</button>,
}));

jest.mock('./CopilotView', () => ({
  __esModule: true,
  default: () => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(() => {
      copilotViewMounts += 1;
    }, []);
    return <div data-testid="copilot-view" />;
  },
}));

jest.mock('@/page/resource/history/ResourceHistoryPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="resource-history-panel" />,
}));

class ResizeObserverMock implements ResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    resizeCallback = callback;
  }

  disconnect() {}
  observe() {}
  unobserve() {}
}

function resizeWorkspace(width: number) {
  resizeCallback(
    [
      {
        contentRect: { width },
      } as ResizeObserverEntry,
    ],
    {} as ResizeObserver
  );
}

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
    writable: true,
  });
  window.dispatchEvent(new Event('resize'));
}

function CommentsControls() {
  const panel = useResourceCommentsPanel();
  return (
    <button
      data-testid="open-comments"
      onClick={() => {
        panel?.setPanelOpen(true);
        panel?.setCommentFocusOffset(80);
      }}
    >
      Open comments
    </button>
  );
}

describe('CopilotPanel', () => {
  let container: HTMLDivElement;
  let root: Root;
  let originalResizeObserver: typeof ResizeObserver | undefined;

  beforeAll(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterAll(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = false;
  });

  beforeEach(() => {
    originalResizeObserver = global.ResizeObserver;
    global.ResizeObserver = ResizeObserverMock;
    sessionStorage.clear();
    useCopilotStore.setState({ workspaces: {} });
    useChatStore.setState({ selectedResources: [] });
    copilotViewMounts = 0;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    document.body.style.overflow = '';
    global.ResizeObserver = originalResizeObserver as typeof ResizeObserver;
  });

  const renderCommentsWorkspace = (app: Hook, namespaceId = 'namespace-a') =>
    act(async () =>
      root.render(
        <AppContext.Provider value={app}>
          <ResourceCommentsProvider namespaceId={namespaceId}>
            <CommentsControls />
            <CopilotPanel namespaceId={namespaceId} />
          </ResourceCommentsProvider>
        </AppContext.Provider>
      )
    );

  it.each(['home', 'conversation', 'history', 'resource_history'] as const)(
    'switches comments to Copilot when adding context from %s',
    async view => {
      const app = new Hook();
      const store = useCopilotStore.getState();
      if (view === 'conversation')
        store.showConversation('namespace-a', 'chat-a');
      if (view === 'history') store.showHistory('namespace-a');
      if (view === 'resource_history')
        store.showResourceHistory('namespace-a', 'resource-a');
      addToChatContext({ id: 'existing-resource' }, 'resource');
      await renderCommentsWorkspace(app);
      act(() =>
        container
          .querySelector<HTMLButtonElement>('[data-testid="open-comments"]')
          ?.click()
      );
      expect(
        container.querySelector('.resource-comments-panel')
      ).not.toBeNull();
      expect(
        container.querySelector('[data-testid="copilot-view"]')
      ).toBeNull();

      act(() => {
        openCopilotForChatContext('namespace-a', app);
        addToChatContext({ id: 'added-resource' }, 'resource');
      });

      expect(container.querySelector('.resource-comments-panel')).toBeNull();
      expect(
        container.querySelector('[data-testid="copilot-view"]')
      ).not.toBeNull();
      expect(
        getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
      ).toMatchObject({
        open: true,
        view: view === 'conversation' ? 'conversation' : 'home',
        conversationId: view === 'conversation' ? 'chat-a' : null,
      });
      expect(
        useChatStore.getState().selectedResources.map(item => item.resource.id)
      ).toEqual(['existing-resource', 'added-resource']);
      expect(
        JSON.parse(sessionStorage.getItem('resource-comments-panel') ?? '{}')
      ).toEqual({});
      expect(
        container
          .querySelector<HTMLElement>('[data-resource-comments-root]')
          ?.style.getPropertyValue('--resource-comment-shift')
      ).toBe('0px');

      await renderCommentsWorkspace(app);
      expect(container.querySelector('.resource-comments-panel')).toBeNull();
      await act(async () => root.render(null));
      expect(app.hasHook('close_resource_comments')).toBe(false);
      await renderCommentsWorkspace(app);
      expect(container.querySelector('.resource-comments-panel')).toBeNull();
    }
  );

  it.each(['namespace-b', 'share:share-a'])(
    'leaves comments in %s open when another namespace adds context',
    async namespaceId => {
      const app = new Hook();
      await renderCommentsWorkspace(app, namespaceId);
      act(() =>
        container
          .querySelector<HTMLButtonElement>('[data-testid="open-comments"]')
          ?.click()
      );

      act(() => openCopilotForChatContext('namespace-a', app));

      expect(
        container.querySelector('.resource-comments-panel')
      ).not.toBeNull();
      expect(
        JSON.parse(sessionStorage.getItem('resource-comments-panel') ?? '{}')
      ).toEqual({ [namespaceId]: true });
      if (namespaceId.startsWith('share:'))
        expect(app.hasHook('close_resource_comments')).toBe(false);
    }
  );

  it('keeps one conversation subtree mounted while closing and changing layouts', async () => {
    act(() => {
      setViewportWidth(900);
      useCopilotStore.getState().showConversation('namespace-a', 'chat-a');
    });
    await act(async () =>
      root.render(<CopilotPanel namespaceId="namespace-a" />)
    );

    const panel = container.querySelector('aside');
    const header = panel?.querySelector('header');
    expect(copilotViewMounts).toBe(1);
    expect(panel?.dataset.layout).toBe('overlay');
    expect(header?.classList).not.toContain('rounded-2xl');
    expect(
      container.querySelector('[data-testid="copilot-title"]')?.textContent
    ).toBe('Panel title');

    act(() => {
      setViewportWidth(1200);
      resizeWorkspace(1200);
    });
    expect(panel?.dataset.layout).toBe('split');
    expect(copilotViewMounts).toBe(1);

    act(() => useCopilotStore.getState().close('namespace-a'));
    expect(
      container.querySelector('[data-testid="copilot-view"]')
    ).not.toBeNull();
    expect(panel?.hasAttribute('inert')).toBe(true);
    expect(panel?.getAttribute('aria-hidden')).toBe('true');
    expect(copilotViewMounts).toBe(1);

    act(() => useCopilotStore.getState().open('namespace-a'));
    expect(copilotViewMounts).toBe(1);
  });

  it('closes an overlay with Escape and restores scrolling and focus', async () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    document.body.style.overflow = 'clip';
    trigger.focus();
    act(() => {
      setViewportWidth(900);
      useCopilotStore.getState().open('namespace-a');
    });

    await act(async () =>
      root.render(<CopilotPanel namespaceId="namespace-a" />)
    );
    act(() => resizeWorkspace(900));

    expect(document.body.style.overflow).toBe('hidden');
    const panel = container.querySelector('aside');
    const controls = panel?.querySelectorAll<HTMLButtonElement>('button');
    const firstControl = controls?.[0];
    const lastControl = controls?.[controls.length - 1];
    lastControl?.focus();
    act(() =>
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    );
    expect(document.activeElement).toBe(firstControl);

    act(() =>
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    );

    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a').open
    ).toBe(false);
    expect(document.body.style.overflow).toBe('clip');
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('returns from resource history to Copilot without changing hook order', async () => {
    act(() => {
      setViewportWidth(1200);
      useCopilotStore
        .getState()
        .showResourceHistory('namespace-a', 'resource-a');
    });

    await act(async () =>
      root.render(<CopilotPanel namespaceId="namespace-a" />)
    );
    expect(
      container.querySelector('[data-testid="resource-history-panel"]')
    ).not.toBeNull();

    act(() => useCopilotStore.getState().showHome('namespace-a'));

    expect(
      container.querySelector('[data-testid="copilot-view"]')
    ).not.toBeNull();
  });
});
