import {
  createChatInputDraft,
  getChatInputDraft,
  saveChatInputDraft,
} from '@/page/chat/chat-input/chatInputDraft';
import {
  insertComposerResource,
  toggleComposerTool,
} from '@/page/chat/chat-input/composerOperations';
import { createComposerState } from '@/page/chat/chat-input/composerState';
import { ToolType } from '@/page/chat/chat-input/types';
import { useChatStore } from '@/page/chat/chatStore';
import {
  getCopilotWorkspace,
  useCopilotStore,
} from '@/page/copilot/copilotStore';

import {
  addToChatContext,
  getChatHomeDraftScope,
  openCopilotForChatContext,
  resetChatForNamespaceSwitch,
} from './chatBridge';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => Array.from(values.keys())[index] ?? null,
    removeItem: key => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe('resetChatForNamespaceSwitch', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = memoryStorage();
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: storage,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: memoryStorage(),
    });
    useChatStore.setState({
      inputResetNonce: 0,
      selectedResources: [
        {
          type: 'resource',
          resource: { id: 'r1', parent_id: null, resource_type: 'file' },
        },
      ],
    });
  });

  it('clears the home draft and bumps the composer reset nonce', () => {
    const scope = getChatHomeDraftScope('n1');
    const withTool = toggleComposerTool(
      createComposerState(''),
      ToolType.WEB_SEARCH,
      '联网搜索',
      { start: 0, end: 0 }
    );

    saveChatInputDraft(
      scope,
      createChatInputDraft(withTool?.state ?? createComposerState('')),
      storage
    );

    resetChatForNamespaceSwitch('n1');

    expect(getChatInputDraft(scope, storage)).toBeUndefined();
    expect(useChatStore.getState().selectedResources).toEqual([]);
    expect(useChatStore.getState().inputResetNonce).toBe(1);
  });
});

describe('openCopilotForChatContext', () => {
  const app = { hasHook: jest.fn(), fire: jest.fn() };

  beforeEach(() => {
    app.hasHook.mockReset().mockReturnValue(false);
    app.fire.mockReset();
    useCopilotStore.setState({ workspaces: {} });
    useChatStore.setState({ selectedResources: [] });
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: memoryStorage(),
    });
  });

  it('reopens an active conversation without switching to home', () => {
    useCopilotStore
      .getState()
      .showConversation('namespace-a', 'conversation-a');
    useCopilotStore.getState().close('namespace-a');

    openCopilotForChatContext('namespace-a', app);

    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
    ).toMatchObject({
      open: true,
      view: 'conversation',
      conversationId: 'conversation-a',
    });
  });

  it('opens Copilot home when there is no active conversation', () => {
    openCopilotForChatContext('namespace-a', app);

    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
    ).toMatchObject({
      open: true,
      view: 'home',
      conversationId: null,
    });
  });

  it('opens Copilot after the comments listener closes the shared panel', () => {
    app.hasHook.mockReturnValue(true);
    app.fire.mockImplementation((_event: string, namespaceId: string) => {
      useCopilotStore.getState().close(namespaceId);
    });

    openCopilotForChatContext('namespace-a', app);

    expect(app.fire).toHaveBeenCalledWith(
      'close_resource_comments',
      'namespace-a'
    );
    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a').open
    ).toBe(true);
  });

  it('does not buffer a comments close when no provider is mounted', () => {
    openCopilotForChatContext('namespace-a', app);

    expect(app.fire).not.toHaveBeenCalled();
  });

  it.each(['conversation', 'resource_history'] as const)(
    'updates only the target conversation draft when adding context from %s',
    view => {
      const draft = createChatInputDraft(createComposerState('Saved question'));
      const homeScope = getChatHomeDraftScope('namespace-a');
      const otherScope = getChatHomeDraftScope('namespace-b');
      saveChatInputDraft(homeScope, draft);
      saveChatInputDraft(otherScope, draft);
      const existing = {
        id: 'existing-resource',
        name: 'Existing file',
        parent_id: null,
        resource_type: 'file' as const,
      };
      const withResource = insertComposerResource(
        draft.composerState,
        existing,
        {
          start: draft.composerState.displayText.length,
          end: draft.composerState.displayText.length,
        },
        'Untitled'
      ).state;
      saveChatInputDraft('conversation-a', createChatInputDraft(withResource));
      useCopilotStore
        .getState()
        .showConversation('namespace-a', 'conversation-a');
      if (view === 'resource_history')
        useCopilotStore
          .getState()
          .showResourceHistory('namespace-a', existing.id);
      addToChatContext(
        { id: 'added-resource', name: 'Added file' },
        'resource'
      );

      openCopilotForChatContext('namespace-a', app);

      expect(getChatInputDraft(homeScope)).toEqual(draft);
      expect(getChatInputDraft(otherScope)).toEqual(draft);
      expect(
        getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
      ).toMatchObject({
        open: true,
        view: 'conversation',
        conversationId: 'conversation-a',
      });
      expect(
        useChatStore.getState().selectedResources.map(item => item.resource.id)
      ).toEqual([existing.id, 'added-resource']);
      expect(
        getChatInputDraft('conversation-a')?.selectedResources.map(
          item => item.resource.id
        )
      ).toEqual([existing.id, 'added-resource']);
    }
  );
});
