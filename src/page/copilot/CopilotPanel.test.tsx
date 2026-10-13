/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import AppContext from '@/hooks/appContext';
import Hook from '@/hooks/hook.class';
import {
  addToChatContext,
  getChatHomeDraftScope,
  openCopilotForChatContext,
} from '@/lib/chatBridge';
import {
  createChatInputDraft,
  getChatInputDraft,
  saveChatInputDraft,
} from '@/page/chat/chat-input/chatInputDraft';
import { syncComposerResources } from '@/page/chat/chat-input/composerExternalSync';
import { toggleComposerTool } from '@/page/chat/chat-input/composerOperations';
import { createComposerState } from '@/page/chat/chat-input/composerState';
import { ToolType } from '@/page/chat/chat-input/types';
import { useChatAreaDraftLifecycle } from '@/page/chat/chat-input/useChatAreaDraftLifecycle';
import { useChatInputComposer } from '@/page/chat/chat-input/useChatInputComposer';
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

jest.mock('i18next', () => ({ t: (key: string) => key }));

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
  default: ({ namespaceId }: { namespaceId: string }) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(() => {
      copilotViewMounts += 1;
    }, []);
    const workspace = useCopilotStore(state =>
      getCopilotWorkspace(state, namespaceId)
    );
    const selectedResources = useChatStore(state => state.selectedResources);
    const setSelectedResources = useChatStore(state => state.setContext);
    const draft = useChatAreaDraftLifecycle({
      messages: [],
      navigatePrefix: `/${namespaceId}`,
      approvalModeResetKey:
        workspace.view === 'conversation'
          ? workspace.conversationId!
          : getChatHomeDraftScope(namespaceId),
      selectedResources,
      setSelectedResources,
    });
    const composer = useChatInputComposer({
      value: draft.query,
      initialComposerState: draft.composerInitialState,
      selectedResources: draft.composerSelectedResources,
      tools: draft.composerTools,
      onChange: draft.handleQueryChange,
      onComposerStateChange: draft.handleComposerStateChange,
      onSelectedResourcesChange: setSelectedResources,
      onToolsChange: draft.handleToolsChange,
      getToolLabel: tool => tool,
      untitledLabel: 'Untitled',
      disabled: false,
      onSend: () => {},
    });
    React.useImperativeHandle(draft.inputRef, () => composer.handle);
    return (
      <div data-testid="copilot-view">
        <textarea
          ref={composer.textareaRef}
          value={composer.displayText}
          readOnly
        />
        <button
          data-testid="clear-composer"
          onClick={draft.clearComposerAfterSend}
        >
          Clear
        </button>
      </div>
    );
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

  it.each([
    ['comments', 'home', 'resource'],
    ['comments', 'conversation', 'folder'],
    ['resource_history', 'home', 'folder'],
    ['resource_history', 'conversation', 'resource'],
    ['resource_history', 'conversation', 'folder'],
  ] as const)(
    'keeps the saved %s draft and added context in the real %s composer (%s)',
    async (panel, view, type) => {
      const app = new Hook();
      const namespaceId = 'namespace-a';
      const scope =
        view === 'conversation' ? 'chat-a' : getChatHomeDraftScope(namespaceId);
      const existing = { id: 'existing-resource', name: 'Existing file' };
      const added = { id: 'added-resource', name: 'Added file' };
      addToChatContext(existing, 'resource');
      const resources = useChatStore.getState().selectedResources;
      const state = syncComposerResources(
        createComposerState('Keep this question '),
        resources,
        'Untitled'
      );
      const withTool = toggleComposerTool(
        state,
        ToolType.WEB_SEARCH,
        ToolType.WEB_SEARCH,
        {
          start: state.displayText.length,
          end: state.displayText.length,
        }
      )!.state;
      saveChatInputDraft(scope, createChatInputDraft(withTool));
      if (view === 'conversation')
        useCopilotStore.getState().showConversation(namespaceId, scope);
      await renderCommentsWorkspace(app);

      act(() => {
        if (panel === 'comments') {
          container
            .querySelector<HTMLButtonElement>('[data-testid="open-comments"]')!
            .click();
        } else {
          useCopilotStore
            .getState()
            .showResourceHistory(namespaceId, existing.id);
        }
      });
      expect(container.querySelector('textarea')).toBeNull();
      act(() => {
        addToChatContext(added, type);
        addToChatContext(added, type);
        openCopilotForChatContext(namespaceId, app);
      });

      const expectedIds = [existing.id, added.id];
      expect(
        getCopilotWorkspace(useCopilotStore.getState(), namespaceId)
      ).toMatchObject({
        open: true,
        view,
        conversationId: view === 'conversation' ? scope : null,
      });
      if (view === 'conversation')
        expect(
          getChatInputDraft(getChatHomeDraftScope(namespaceId))
        ).toBeUndefined();
      expect(
        useChatStore.getState().selectedResources.map(item => item.resource.id)
      ).toEqual(expectedIds);
      expect(container.querySelector('textarea')!.value).toContain(
        'Keep this question'
      );
      expect(container.querySelector('textarea')!.value).toContain(added.name);
      const restored = getChatInputDraft(scope)!;
      expect(restored.selectedResources.map(item => item.resource.id)).toEqual(
        expectedIds
      );
      expect(restored.tools).toEqual([ToolType.WEB_SEARCH]);
      expect(restored.composerState.mentions[1].type).toBe(type);
      expect(restored.composerState.toolRanges).toEqual(withTool.toolRanges);

      await act(async () => root.render(null));
      await renderCommentsWorkspace(app);
      expect(
        useChatStore.getState().selectedResources.map(item => item.resource.id)
      ).toEqual(expectedIds);
      act(() =>
        container
          .querySelector<HTMLButtonElement>('[data-testid="clear-composer"]')!
          .click()
      );
      expect(getChatInputDraft(scope)).toBeUndefined();
      expect(useChatStore.getState().selectedResources).toEqual([]);
      expect(container.querySelector('textarea')!.value).toBe('');
    }
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
        addToChatContext({ id: 'added-resource' }, 'resource');
        openCopilotForChatContext('namespace-a', app);
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
