import type { Application } from '@/interface';

import {
  isSupportedApplicationId,
  sortApplicationsForDisplay,
} from './applicationOrder';

function application(appId: string): Application {
  return {
    id: `app-${appId}`,
    namespace_id: 'ns',
    user_id: 'user',
    app_id: appId,
  };
}

describe('sortApplicationsForDisplay', () => {
  it('moves the WeChat AI assistant to the front', () => {
    const sorted = sortApplicationsForDisplay([
      application('wechat_bot'),
      application('qq_bot'),
      application('wechat_oa_bot'),
    ]);

    expect(sorted.map(item => item.app_id)).toEqual([
      'wechat_oa_bot',
      'wechat_bot',
      'qq_bot',
    ]);
  });

  it('uses the shared assistant order regardless of the server order', () => {
    const sorted = sortApplicationsForDisplay([
      application('telegram_bot'),
      application('qq_bot'),
      application('wechat_clawbot'),
      application('wechat_bot'),
    ]);

    expect(sorted.map(item => item.app_id)).toEqual([
      'wechat_bot',
      'qq_bot',
      'wechat_clawbot',
      'telegram_bot',
    ]);
  });

  it('places assistants missing from the shared order after the known ones', () => {
    const sorted = sortApplicationsForDisplay([
      application('slack_bot'),
      application('wechat_oa_bot'),
      application('telegram_bot'),
      application('discord_bot'),
    ]);

    expect(sorted.map(item => item.app_id)).toEqual([
      'wechat_oa_bot',
      'telegram_bot',
      'slack_bot',
      'discord_bot',
    ]);
  });

  it('leaves the input array untouched', () => {
    const applications = [
      application('wechat_bot'),
      application('wechat_oa_bot'),
    ];

    sortApplicationsForDisplay(applications);

    expect(applications.map(item => item.app_id)).toEqual([
      'wechat_bot',
      'wechat_oa_bot',
    ]);
  });

  it('handles an empty list', () => {
    expect(sortApplicationsForDisplay([])).toEqual([]);
  });
});

describe('isSupportedApplicationId', () => {
  it.each([
    'wechat_oa_bot',
    'wechat_bot',
    'qq_bot',
    'wechat_clawbot',
    'telegram_bot',
  ])('accepts %s', appId => {
    expect(isSupportedApplicationId(appId)).toBe(true);
  });

  it.each(['slack_bot', '', 'WECHAT_BOT'])('rejects %s', appId => {
    expect(isSupportedApplicationId(appId)).toBe(false);
  });
});
