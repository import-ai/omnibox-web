import type { i18n as I18nType } from 'i18next';

import { groupItemsByTimestamp } from '@/page/chat/utils';

import {
  applyProvisionalConversations,
  messagePreviewTitle,
} from './provisionalConversation';

function i18nMock(language: string): I18nType {
  return {
    language,
    t: (key: string) => key,
  } as unknown as I18nType;
}

describe('provisional conversations', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-14T09:49:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses the first message text without the web search token', () => {
    expect(
      messagePreviewTitle('  [web_search](tool://web_search)\n你好  ')
    ).toBe('你好');
  });

  it('updates an empty conversation in place and keeps it under today', () => {
    const page = applyProvisionalConversations(
      {
        total: 1,
        data: [
          {
            id: 'new-chat',
            title: '',
            created_at: '2026-10-14T09:40:00',
          },
        ],
      },
      [
        {
          id: 'new-chat',
          title: '你好',
          created_at: '2026-10-14T09:49:00',
        },
      ]
    );

    expect(page.data).toEqual([
      {
        id: 'new-chat',
        title: '你好',
        created_at: '2026-10-14T09:40:00',
      },
    ]);
    expect(page.total).toBe(1);
    expect(page.confirmedIds).toEqual([]);
    expect(
      groupItemsByTimestamp(page.data, i18nMock('zh-CN')).map(
        ([key, items]) => [key, items.map(item => item.id)]
      )
    ).toEqual([['date.today', ['new-chat']]]);
  });

  it('prepends a missing conversation at the top of today', () => {
    const page = applyProvisionalConversations(
      {
        total: 1,
        data: [
          {
            id: 'older-chat',
            title: '昨天的对话',
            created_at: '2026-10-13T09:00:00',
          },
        ],
      },
      [
        {
          id: 'new-chat',
          title: '你好',
          created_at: '2026-10-14T09:49:00',
        },
      ]
    );

    expect(page.data.map(item => item.id)).toEqual(['new-chat', 'older-chat']);
    expect(page.data[0]).toEqual({
      id: 'new-chat',
      title: '你好',
      created_at: '2026-10-14T09:49:00',
    });
    expect(page.total).toBe(2);
    expect(groupItemsByTimestamp(page.data, i18nMock('zh-CN'))[0]).toEqual([
      'date.today',
      [expect.objectContaining({ id: 'new-chat', title: '你好' })],
    ]);
  });

  it('keeps a server title and marks the provisional entry confirmed', () => {
    const page = applyProvisionalConversations(
      {
        total: 1,
        data: [
          {
            id: 'new-chat',
            title: '简短问候',
            created_at: '2026-10-14T09:40:00',
          },
        ],
      },
      [
        {
          id: 'new-chat',
          title: '你好',
          created_at: '2026-10-14T09:49:00',
        },
      ]
    );

    expect(page.data[0].title).toBe('简短问候');
    expect(page.confirmedIds).toEqual(['new-chat']);
    expect(page.total).toBe(1);
  });

  it('keeps the preview provisional when the same text is applied again', () => {
    const once = applyProvisionalConversations(
      {
        total: 1,
        data: [
          { id: 'new-chat', title: '', created_at: '2026-10-14T09:40:00' },
        ],
      },
      [
        {
          id: 'new-chat',
          title: '你好',
          created_at: '2026-10-14T09:49:00',
        },
      ]
    );

    const twice = applyProvisionalConversations(
      { total: once.total, data: once.data },
      [
        {
          id: 'new-chat',
          title: '你好',
          created_at: '2026-10-14T09:49:00',
        },
      ]
    );

    expect(twice.confirmedIds).toEqual([]);
    expect(twice.data).toHaveLength(1);
    expect(twice.data[0].title).toBe('你好');
    expect(twice.total).toBe(1);
  });

  it('drops the message text after the provisional entry is cleared', () => {
    const page = applyProvisionalConversations(
      {
        total: 1,
        data: [
          { id: 'new-chat', title: '', created_at: '2026-10-14T09:40:00' },
        ],
      },
      []
    );

    expect(page.data[0].title).toBe('');
    expect(page.total).toBe(1);
  });
});
