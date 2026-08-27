import { http } from '@/lib/request';

import { createConversationShare } from './conversationShare';

jest.mock('@/lib/request', () => ({
  http: { post: jest.fn() },
}));

const post = http.post as jest.MockedFunction<typeof http.post>;

describe('createConversationShare', () => {
  beforeEach(() => post.mockReset());

  it('posts the selected groups to the namespace endpoint', async () => {
    post.mockResolvedValue({
      id: 'share-1',
      url: 'https://www.omnibox.pro/conversation-share/?share_id=share-1',
      title: 'Title',
      summary: 'Summary',
    });

    await expect(
      createConversationShare('namespace-1', {
        channel: 'copy_link',
        conversation_id: 'conversation-1',
        group_ids: ['question-1', 'question-2'],
      })
    ).resolves.toEqual(expect.objectContaining({ id: 'share-1' }));
    expect(post).toHaveBeenCalledWith(
      '/namespaces/namespace-1/conversation-shares',
      expect.objectContaining({ group_ids: ['question-1', 'question-2'] }),
      { mute: true }
    );
  });

  it('rejects an incomplete API response', async () => {
    post.mockResolvedValue({ id: 'share-1', url: '' });

    await expect(
      createConversationShare('namespace-1', {
        channel: 'wechat_session',
        conversation_id: 'conversation-1',
        group_ids: ['question-1'],
      })
    ).rejects.toThrow('incomplete');
  });
});
