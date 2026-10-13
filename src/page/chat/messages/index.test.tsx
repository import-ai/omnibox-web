import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { MessageOperator } from '../core/messageOperator';
import type { Citation } from '../core/types/chatResponse';
import { MessageStatus, OpenAIMessageRole } from '../core/types/chatResponse';
import type {
  ConversationDetail,
  MessageDetail,
} from '../core/types/conversation';
import { Messages } from './index';
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string) => s }),
}));
jest.mock('@/page/share/ShareChatOnlyContext', () => ({
  useShareChatOnly: () => false,
}));
jest.mock('@/page/chat/messages/role/AssistantMessage', () => ({
  AssistantMessage: ({ citations }: { citations: Citation[] }) => (
    <output>{JSON.stringify(citations)}</output>
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
