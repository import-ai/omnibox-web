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
