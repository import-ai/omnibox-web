import type { i18n as I18nType } from 'i18next';

import { groupItemsByTimestamp } from './utils';

function i18nMock(language: string): I18nType {
  return {
    language,
    t: (key: string) => key,
  } as unknown as I18nType;
}

const en = i18nMock('en');
const zh = i18nMock('zh-CN');

describe('groupItemsByTimestamp', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-15T12:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('buckets items into today, yesterday, last week and months', () => {
    const items = [
      { id: 'today', updated_at: '2026-03-15T09:00:00' },
      { id: 'yesterday', updated_at: '2026-03-14T09:00:00' },
      { id: 'last-week', updated_at: '2026-03-11T09:00:00' },
      { id: 'february', updated_at: '2026-02-20T09:00:00' },
      { id: 'january', updated_at: '2026-01-05T09:00:00' },
    ];

    expect(
      groupItemsByTimestamp(items, en).map(([key, group]) => [
        key,
        group.map(item => item.id),
      ])
    ).toEqual([
      ['date.today', ['today']],
      ['date.yesterday', ['yesterday']],
      ['date.last_week', ['last-week']],
      ['February 2026', ['february']],
      ['January 2026', ['january']],
    ]);
  });

  it('orders month groups from newest to oldest regardless of input order', () => {
    const items = [
      { id: 'january', updated_at: '2026-01-05T09:00:00' },
      { id: 'december', updated_at: '2025-12-31T09:00:00' },
      { id: 'february', updated_at: '2026-02-20T09:00:00' },
    ];

    expect(groupItemsByTimestamp(items, en).map(([key]) => key)).toEqual([
      'February 2026',
      'January 2026',
      'December 2025',
    ]);
  });

  it('localizes month labels for Chinese', () => {
    const items = [{ id: 'february', updated_at: '2026-02-20T09:00:00' }];

    expect(groupItemsByTimestamp(items, zh).map(([key]) => key)).toEqual([
      '2026 年 2 月',
    ]);
  });

  it('supports a custom timestamp accessor', () => {
    const items = [
      { id: 'published', published_at: '2026-03-15T09:00:00', created_at: '' },
      { id: 'fallback', published_at: null, created_at: '2026-02-20T09:00:00' },
    ];

    expect(
      groupItemsByTimestamp(
        items,
        en,
        item => item.published_at || item.created_at
      ).map(([key, group]) => [key, group.map(item => item.id)])
    ).toEqual([
      ['date.today', ['published']],
      ['February 2026', ['fallback']],
    ]);
  });
});
