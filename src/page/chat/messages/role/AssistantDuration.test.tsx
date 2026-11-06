import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  MessageStatus,
  OpenAIMessageRole,
} from '../../core/types/chatResponse';
import type { MessageDetail } from '../../core/types/conversation';
import { AssistantMessage } from './AssistantMessage';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => ({ fire: jest.fn() }),
}));
jest.mock('../../conversation/MessageDetailsContext', () => ({
  useMessageDetails: () => ({ load: jest.fn() }),
  DetailLoadState: () => null,
}));
jest.mock('@/page/localRuntime/ConversationExecutions', () => ({
  ToolCallExecution: () => null,
}));
jest.mock('@/page/chat/components/ToolCallArgs', () => ({
  ToolCallArgs: () => null,
}));
jest.mock('@/page/chat/messages/citations/CitationMarkdown', () => ({
  CitationMarkdown: ({
    content,
    metadata,
  }: {
    content: string;
    metadata?: ReactNode;
  }) => (
    <div>
      {content}
      <div>
        <button>Copy action</button>
        {metadata}
      </div>
    </div>
  ),
}));

test.each([false, true])(
  'keeps the duration in the answer toolbar with reasoning: %s',
  reasoning => {
    const message: MessageDetail = {
      id: 'a',
      parent_id: 'q',
      children: [],
      status: MessageStatus.SUCCESS,
      message: {
        role: OpenAIMessageRole.ASSISTANT,
        content: 'Answer body',
        ...(reasoning ? { reasoning_content: 'Thinking' } : {}),
      },
      attrs: {
        answer_timing: {
          version: 1,
          answer_id: 'run',
          run_id: 'run',
          started_at: '2026-11-06T00:00:00Z',
          ended_at: '2026-11-06T00:00:08Z',
          previous_duration_ms: 0,
          duration_ms: 8000,
          outcome: 'success',
        },
      },
    };
    const html = renderToStaticMarkup(
      <AssistantMessage
        conversation={{ id: 'c', mapping: { a: message } }}
        message={message}
        messages={[message]}
        citations={[]}
        messageOperator={{ getSiblings: () => ['a'] } as never}
        onRegenerate={() => {}}
        isLastMessage
      />
    );
    expect(html.indexOf('Answer body')).toBeLessThan(
      html.indexOf('chat.messages.answer_duration.success')
    );
    expect(html.indexOf('Copy action')).toBeLessThan(
      html.indexOf('chat.messages.answer_duration.success')
    );
    expect(html.match(/chat.messages.answer_duration.success/g)).toHaveLength(
      1
    );
  }
);
