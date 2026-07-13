import { ToolType } from '@/page/chat/chat-input/types';
import {
  MessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/core/types/chatResponse';
import type { MessageDetail } from '@/page/chat/core/types/conversation';

import {
  createToolRestoreState,
  getRestoredTools,
  resolveToolRestore,
  suppressNextToolRestore,
} from './chatInputToolRestore';

function userMessage(
  id: string,
  tools: ToolType[],
  status = MessageStatus.SUCCESS
): MessageDetail {
  return {
    id,
    parent_id: '',
    children: [],
    status,
    message: {
      role: OpenAIMessageRole.USER,
      content: '你好',
    },
    attrs: {
      tools: tools.map(tool => ({ name: tool })),
      enable_thinking: tools.includes(ToolType.REASONING),
    },
  };
}

describe('chat input tool restoration', () => {
  it('restores tools from the latest existing user message', () => {
    const restoredTools = getRestoredTools(
      [userMessage('u1', [ToolType.WEB_SEARCH])],
      'conversation-1'
    );

    const result = resolveToolRestore(
      restoredTools,
      createToolRestoreState(),
      false
    );

    expect(result.toolsToRestore).toEqual([ToolType.WEB_SEARCH]);
    expect(result.nextState.signature).toBe('u1:web_search');
  });

  it('does not consume initial-send suppression while messages are still empty', () => {
    const result = resolveToolRestore(
      getRestoredTools([], 'conversation-1'),
      createToolRestoreState(true),
      true
    );

    expect(result.toolsToRestore).toEqual([]);
    expect(result.nextState.skipNextRestore).toBe(true);
  });

  it('skips restoring tools from the first payload-created user message', () => {
    const emptyResult = resolveToolRestore(
      getRestoredTools([], 'conversation-1'),
      createToolRestoreState(true),
      true
    );

    const sentMessageResult = resolveToolRestore(
      getRestoredTools(
        [userMessage('u1', [ToolType.WEB_SEARCH])],
        'conversation-1'
      ),
      emptyResult.nextState,
      true
    );

    expect(sentMessageResult.toolsToRestore).toBeUndefined();
    expect(sentMessageResult.nextState.skipNextRestore).toBe(false);
    expect(sentMessageResult.nextState.signature).toBe('u1:web_search');
  });

  it('skips restoring tools from a locally submitted message', () => {
    const initialResult = resolveToolRestore(
      getRestoredTools([userMessage('u1', [])], 'conversation-1'),
      createToolRestoreState(),
      false
    );
    const afterSubmitState = suppressNextToolRestore(
      initialResult.nextState,
      false
    );

    const sentMessageResult = resolveToolRestore(
      getRestoredTools(
        [userMessage('u1', []), userMessage('u2', [ToolType.WEB_SEARCH])],
        'conversation-1'
      ),
      afterSubmitState,
      false
    );

    expect(sentMessageResult.toolsToRestore).toBeUndefined();
    expect(sentMessageResult.nextState.signature).toBe('u2:web_search');
  });

  it('keeps a submitted message suppressed while its attrs arrive in stages', () => {
    const initialResult = resolveToolRestore(
      getRestoredTools([userMessage('u1', [])], 'conversation-1'),
      createToolRestoreState(),
      false
    );
    const afterSubmitState = suppressNextToolRestore(
      initialResult.nextState,
      false
    );
    const partialMessage = userMessage('u2', []);
    partialMessage.attrs = { composer: { display_parts: [] } };

    const partialResult = resolveToolRestore(
      getRestoredTools(
        [userMessage('u1', []), partialMessage],
        'conversation-1'
      ),
      afterSubmitState,
      false
    );
    const completeResult = resolveToolRestore(
      getRestoredTools(
        [
          userMessage('u1', []),
          userMessage('u2', [ToolType.WEB_SEARCH, ToolType.REASONING]),
        ],
        'conversation-1'
      ),
      partialResult.nextState,
      false
    );

    expect(partialResult.toolsToRestore).toBeUndefined();
    expect(completeResult.toolsToRestore).toBeUndefined();
  });
});
