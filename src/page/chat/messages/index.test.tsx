import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { MessageOperator } from '../core/messageOperator';
import type { Citation } from '../core/types/chatResponse';
import { MessageStatus, OpenAIMessageRole } from '../core/types/chatResponse';
import type {
  ConversationDetail,
  MessageDetail,
} from '../core/types/conversation';
import { AnswerDuration } from './AnswerDuration';
import { Messages } from './index';
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string) => s }),
}));
jest.mock('@/page/share/ShareChatOnlyContext', () => ({
  useShareChatOnly: () => false,
}));
jest.mock('@/page/chat/messages/role/AssistantMessage', () => ({
  AssistantMessage: ({
    citations,
    message,
  }: {
    citations: Citation[];
    message: MessageDetail;
  }) => (
    <>
      <output>{JSON.stringify(citations)}</output>
      <AnswerDuration message={message} />
    </>
  ),
}));
jest.mock('@/page/chat/messages/role/ToolMessage', () => ({
  ToolMessage: () => null,
}));
jest.mock('@/page/chat/messages/role/UserMessage', () => ({
  UserMessage: () => null,
}));
jest.mock('@/page/chat/share/ConversationShareMessageRow', () => ({
  ConversationShareMessageRow: ({ children }: { children: React.ReactNode }) =>
    children,
}));
const node = (
  id: string,
  extra: Partial<MessageDetail> = {}
): MessageDetail => ({
  id,
  clientKey: 1,
  children: [],
  parent_id: '',
  status: MessageStatus.SUCCESS,
  message: { role: OpenAIMessageRole.ASSISTANT, content: 'answer' },
  ...extra,
});

test('streamed citations remain visible after paginated bootstrap', () => {
  const citation = {
    id: 'C1',
    title: 'source',
    link: 'https://example.com',
    snippet: 'full',
  };
  const tool = node('tool', {
    message: { role: OpenAIMessageRole.TOOL },
    attrs: { citations: [citation] },
  });
  const answer = node('answer', {
    status: MessageStatus.STREAMING,
    message: { role: OpenAIMessageRole.ASSISTANT, content: 'answer [[1]]' },
  });
  const conversation: ConversationDetail = {
    id: 'c',
    citations: [],
    current_node: 'answer',
    mapping: { tool, answer },
  };
  const html = renderToStaticMarkup(
    <Messages
      conversation={conversation}
      messages={[tool, answer]}
      messageOperator={
        { getParent: () => undefined } as unknown as MessageOperator
      }
      onEdit={() => {}}
      onRegenerate={() => {}}
    />
  );
  expect(html).toContain('C1');
});

test.each([false, true])(
  'renders one answer duration with a collapsed process: %s',
  multiStep => {
    const timing = {
      version: 1,
      answer_id: 'a',
      run_id: 'run',
      started_at: '2026-11-05T00:00:00Z',
      previous_duration_ms: 0,
      duration_ms: 8000,
      outcome: 'success',
    } as const;
    const answer = node('answer', {
      attrs: { answer_timing: timing },
      message: {
        role: OpenAIMessageRole.ASSISTANT,
        content: 'answer',
        reasoning_content: 'think',
      },
    });
    const process = node('process', {
      attrs: { answer_timing: { ...timing, outcome: 'running' } },
      message: { role: OpenAIMessageRole.ASSISTANT, content: 'working' },
    });
    const messages = multiStep ? [process, answer] : [answer];
    const html = renderToStaticMarkup(
      <Messages
        conversation={{ id: 'c', mapping: { process, answer } }}
        messages={messages}
        messageOperator={
          { getParent: () => undefined } as unknown as MessageOperator
        }
        onEdit={() => {}}
        onRegenerate={() => {}}
      />
    );
    expect(html.match(/chat.messages.answer_duration.success/g)).toHaveLength(
      1
    );
    if (multiStep) expect(html).toContain('chat.messages.process.title');
    expect(html).not.toContain('chat.messages.process.duration');
  }
);

test.each([
  ['Software caused connection abort', undefined, 'connection_interrupted'],
  ['provider detail', undefined, 'unknown'],
  ['', 'CONVERSATION_BUSY', 'busy'],
  [undefined, undefined, 'unknown'],
])(
  'localizes failed message %s without rendering its raw details',
  (message, code, key) => {
    const failed = node('failed', {
      status: MessageStatus.FAILED,
      attrs: { error_message: message, error_code: code },
    });
    const html = renderToStaticMarkup(
      <Messages
        conversation={{ id: 'c', mapping: { failed } }}
        messages={[failed]}
        messageOperator={
          { getParent: () => undefined } as unknown as MessageOperator
        }
        onEdit={() => {}}
        onRegenerate={() => {}}
      />
    );
    expect(html).toContain(`chat.errors.${key}`);
    if (message) expect(html).not.toContain(message);
  }
);
