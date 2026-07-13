import {
  createChatInputDraft,
  getChatInputDraft,
  saveChatInputDraft,
} from '@/page/chat/chat-input/chatInputDraft';
import { toggleComposerTool } from '@/page/chat/chat-input/composerOperations';
import { createComposerState } from '@/page/chat/chat-input/composerState';
import { ToolType } from '@/page/chat/chat-input/types';
import { useChatStore } from '@/page/chat/chatStore';

import {
  getChatHomeDraftScope,
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
