import {
  MessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/core/types/chatResponse';
import type { MessageDetail } from '@/page/chat/core/types/conversation';

import {
  areAllConversationShareGroupsSelected,
  buildConversationShareGroups,
  createConversationShareSelection,
  getConversationShareGroupForMessage,
  selectAllConversationShareGroups,
  toggleConversationShareGroup,
} from './conversationShareGroups';

function message(
  id: string,
  role: OpenAIMessageRole,
  content: string,
  parentId = '',
  status = MessageStatus.SUCCESS,
  overrides: Partial<MessageDetail> = {}
): MessageDetail {
  return {
    id,
    parent_id: parentId,
    children: [],
    status,
    message: { role, content },
    created_at: '2026-08-25T00:00:00.000Z',
    updated_at: '2026-08-25T00:00:00.000Z',
    ...overrides,
  } as MessageDetail;
}

describe('conversationShareGroups', () => {
  it('builds complete question-answer groups in conversation order', () => {
    const messages = [
      message('q1', OpenAIMessageRole.USER, 'First question'),
      message('a1', OpenAIMessageRole.ASSISTANT, 'First answer', 'q1'),
      message('q2', OpenAIMessageRole.USER, 'Second question', 'a1'),
      message('tool', OpenAIMessageRole.TOOL, '', 'q2'),
      message('a2', OpenAIMessageRole.ASSISTANT, 'Second answer', 'tool'),
    ];

    expect(buildConversationShareGroups(messages)).toEqual([
      expect.objectContaining({
        id: 'q1',
        messageIds: ['q1', 'a1'],
      }),
      expect.objectContaining({
        id: 'q2',
        messageIds: ['q2', 'a2'],
      }),
    ]);
  });

  it('excludes decisions and non-final or tool-call answers', () => {
    const messages = [
      message(
        'decision',
        OpenAIMessageRole.USER,
        'Approve',
        '',
        MessageStatus.SUCCESS,
        {
          attrs: {
            tool_call: {
              status: 'success',
              decisions: [{ type: 'approve' as never }],
            },
          },
        }
      ),
      message(
        'decision-answer',
        OpenAIMessageRole.ASSISTANT,
        'Done',
        'decision'
      ),
      message('q-pending', OpenAIMessageRole.USER, 'Pending question'),
      message(
        'a-pending',
        OpenAIMessageRole.ASSISTANT,
        'Still writing',
        'q-pending',
        MessageStatus.STREAMING
      ),
      message('q-tool', OpenAIMessageRole.USER, 'Tool question'),
      message(
        'a-tool',
        OpenAIMessageRole.ASSISTANT,
        'Tool answer',
        'q-tool',
        MessageStatus.SUCCESS,
        {
          message: {
            role: OpenAIMessageRole.ASSISTANT,
            content: 'Tool answer',
            tool_calls: [
              {
                id: 'call-1',
                type: 'function',
                function: { name: 'search', arguments: '{}' },
              },
            ],
          },
        }
      ),
      message('q-failed', OpenAIMessageRole.USER, 'Failed question'),
      message(
        'a-failed',
        OpenAIMessageRole.ASSISTANT,
        'Failed answer',
        'q-failed',
        MessageStatus.FAILED
      ),
    ];

    expect(buildConversationShareGroups(messages)).toEqual([]);
  });

  it('anchors the initial selection to either message in the target group', () => {
    const groups = buildConversationShareGroups([
      message('q1', OpenAIMessageRole.USER, 'First'),
      message('a1', OpenAIMessageRole.ASSISTANT, 'Answer', 'q1'),
      message('q2', OpenAIMessageRole.USER, 'Second', 'a1'),
      message('a2', OpenAIMessageRole.ASSISTANT, 'Answer', 'q2'),
    ]);

    expect(createConversationShareSelection(groups, 'q1')).toEqual(
      new Set(['q1'])
    );
    expect(createConversationShareSelection(groups, 'a1')).toEqual(
      new Set(['q1'])
    );
    expect(createConversationShareSelection(groups, 'missing')).toEqual(
      new Set()
    );
    expect(getConversationShareGroupForMessage(groups, 'a2')?.id).toBe('q2');
  });

  it('supports latest, all, toggle, and cancel-all selection rules', () => {
    const groups = buildConversationShareGroups([
      message('q1', OpenAIMessageRole.USER, 'First'),
      message('a1', OpenAIMessageRole.ASSISTANT, 'Answer', 'q1'),
      message('q2', OpenAIMessageRole.USER, 'Second', 'a1'),
      message('a2', OpenAIMessageRole.ASSISTANT, 'Answer', 'q2'),
    ]);

    expect(createConversationShareSelection(groups)).toEqual(new Set(['q2']));
    expect(createConversationShareSelection(groups, undefined, 'all')).toEqual(
      new Set(['q1', 'q2'])
    );
    expect(selectAllConversationShareGroups(groups)).toEqual(
      new Set(['q1', 'q2'])
    );
    expect(
      areAllConversationShareGroupsSelected(groups, new Set(['q1', 'q2']))
    ).toBe(true);
    expect(areAllConversationShareGroupsSelected([], new Set())).toBe(false);
    expect(toggleConversationShareGroup(new Set(['q1']), 'q2', groups)).toEqual(
      new Set(['q1', 'q2'])
    );
    expect(
      toggleConversationShareGroup(new Set(['q1', 'q2']), 'q1', groups)
    ).toEqual(new Set(['q2']));
  });
});
