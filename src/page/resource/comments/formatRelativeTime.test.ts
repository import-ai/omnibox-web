import * as en from '@/i18n/locales/en.json';
import * as zh from '@/i18n/locales/zh.json';

import { formatRelativeTime } from './formatRelativeTime';

describe('formatRelativeTime', () => {
  const now = new Date('2026-10-12T05:00:00.000Z').getTime();

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(now);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses localized just-now copy inside the current minute', () => {
    const value = new Date(now - 10_000).toISOString();
    expect(zh.resource_comments.just_now).toBe('刚刚');
    expect(en.resource_comments.just_now).toBe('Just now');
    expect(
      formatRelativeTime(value, 'zh-CN', zh.resource_comments.just_now)
    ).toBe('刚刚');
    expect(formatRelativeTime(value, 'en', en.resource_comments.just_now)).toBe(
      'Just now'
    );
  });

  it('spaces Chinese relative times and preserves English output', () => {
    expect(
      formatRelativeTime(new Date(now - 60_000).toISOString(), 'zh-CN', '刚刚')
    ).toBe('1 分钟前');
    expect(
      formatRelativeTime(
        new Date(now - 5 * 60_000).toISOString(),
        'zh-CN',
        '刚刚'
      )
    ).toBe('5 分钟前');
    expect(
      formatRelativeTime(new Date(now - 60_000).toISOString(), 'en', 'Just now')
    ).toBe('1 minute ago');
  });
});
