import { WEB_SEARCH_QUERY_TOKEN } from '@/page/chat/chat-input/composerQuery';
import { messagePreviewTitle } from '@/page/chat/conversations/provisionalConversation';

import { MessageStatus, OpenAIMessageRole } from './core/types/chatResponse';
import { getTitleFromConversationDetail } from './utils';

it('omits the web search protocol from the fallback conversation title', () => {
  expect(
    getTitleFromConversationDetail({
      id: 'c1',
      mapping: {
        m1: {
          id: 'm1',
          parent_id: '',
          children: [],
          status: MessageStatus.SUCCESS,
          message: {
            role: OpenAIMessageRole.USER,
            content: 'Latest news [web_search](tool://web_search)',
          },
        },
      },
    })
  ).toBe('Latest news');
});

it('uses the sidebar preview when the stored title is empty', () => {
  const content = `  ${WEB_SEARCH_QUERY_TOKEN}\n你好  `;
  expect(
    getTitleFromConversationDetail({
      id: 'c1',
      mapping: {
        m1: {
          id: 'm1',
          parent_id: '',
          children: [],
          status: MessageStatus.SUCCESS,
          message: { role: OpenAIMessageRole.USER, content },
        },
      },
    })
  ).toBe(messagePreviewTitle(content));
});
