import type { i18n as I18nType } from 'i18next';

import { WEB_SEARCH_QUERY_TOKEN } from '@/page/chat/chat-input/composerQuery';
import { messagePreviewTitle } from '@/page/chat/conversations/provisionalConversation';
import { ConversationSummary } from '@/page/chat/core/types/conversation';

import { MessageStatus, OpenAIMessageRole } from './core/types/chatResponse';
import { getTitleFromConversationDetail, groupItemsByTimestamp } from './utils';

function i18nMock(language: string): I18nType {
  const messages: Record<string, string> = language
    .toLowerCase()
    .startsWith('zh')
    ? { 'date.calendar_day': '{{year}} 年 {{month}} 月 {{day}} 日' }
    : {};
  return {
    language,
    t: (key: string, options?: Record<string, unknown>) => {
      let text = messages[key] ?? key;
      if (options) {
        for (const [name, value] of Object.entries(options)) {
          text = text.replaceAll(`{{${name}}}`, String(value));
        }
      }
      return text;
    },
  } as unknown as I18nType;
}

const en = i18nMock('en');
const zh = i18nMock('zh-CN');

function item(
  id: string,
  created_at?: string,
  updated_at?: string
): ConversationSummary {
  return { id, title: id, created_at, updated_at };
}

describe('groupItemsByTimestamp', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-15T12:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps today, yesterday and the last 7 days, then splits older days', () => {
    const items = [
      item('today', '2026-09-15T09:00:00'),
      item('yesterday', '2026-09-14T09:00:00'),
      item('within-week', '2026-09-09T09:00:00'),
      item('sep-1-later', '2026-09-01T18:00:00'),
      item('sep-1-earlier', '2026-09-01T08:00:00'),
      item('aug-31', '2026-08-31T09:00:00'),
    ];

    expect(
      groupItemsByTimestamp(items, en).map(([key, group]) => [
        key,
        group.map(entry => entry.id),
      ])
    ).toEqual([
      ['date.today', ['today']],
      ['date.yesterday', ['yesterday']],
      ['date.last_week', ['within-week']],
      ['Sep 1, 2026', ['sep-1-later', 'sep-1-earlier']],
      ['Aug 31, 2026', ['aug-31']],
    ]);
  });

  it('orders day groups from newest to oldest regardless of input order', () => {
    const items = [
      item('aug-31', '2026-08-31T09:00:00'),
      item('sep-2', '2026-09-02T09:00:00'),
      item('sep-1', '2026-09-01T09:00:00'),
    ];

    expect(groupItemsByTimestamp(items, en).map(([key]) => key)).toEqual([
      'Sep 2, 2026',
      'Sep 1, 2026',
      'Aug 31, 2026',
    ]);
  });

  it('localizes day labels for Chinese', () => {
    const items = [item('sep-1', '2026-09-01T09:00:00')];

    expect(groupItemsByTimestamp(items, zh).map(([key]) => key)).toEqual([
      '2026 年 9 月 1 日',
    ]);
  });

  it('groups a conversation by its update time instead of its creation time', () => {
    const items = [
      item('updated-today', '2026-09-01T09:00:00', '2026-09-15T09:00:00'),
    ];

    expect(groupItemsByTimestamp(items, en).map(([key]) => key)).toEqual([
      'date.today',
    ]);
  });

  it('places a conversation from exactly seven days ago on its calendar day', () => {
    const items = [item('seven-days', '2026-09-08T09:00:00')];

    expect(groupItemsByTimestamp(items, en).map(([key]) => key)).toEqual([
      'Sep 8, 2026',
    ]);
  });

  it('uses the creation time when the update time is blank', () => {
    const items = [item('created-yesterday', '2026-09-14T09:00:00', '')];

    expect(groupItemsByTimestamp(items, en).map(([key]) => key)).toEqual([
      'date.yesterday',
    ]);
  });

  it('keeps an invalid update time out of the creation-time group', () => {
    const items = [item('bad-update', '2026-09-15T09:00:00', 'not-a-date')];

    expect(groupItemsByTimestamp(items, en).map(([key]) => key)).toEqual([
      'date.earlier',
    ]);
  });

  it('puts conversations without a created time in earlier', () => {
    const items = [
      item('missing'),
      item('blank', ''),
      item('sep-1', '2026-09-01T09:00:00'),
    ];

    expect(
      groupItemsByTimestamp(items, zh).map(([key, group]) => [
        key,
        group.map(entry => entry.id),
      ])
    ).toEqual([
      ['2026 年 9 月 1 日', ['sep-1']],
      ['date.earlier', ['missing', 'blank']],
    ]);
  });
});

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
