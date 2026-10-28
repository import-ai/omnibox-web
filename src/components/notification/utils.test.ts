import type { NotificationDetail, NotificationItem } from './types';
import { isCampaignRewardNotification, mergeNotificationDetail } from './utils';

describe('mergeNotificationDetail', () => {
  it('keeps the system type from the selected list item', () => {
    const detail = {
      notification_type: 'activity',
    } as NotificationDetail;
    const item = {
      notification_type: 'system',
    } as NotificationItem;

    expect(mergeNotificationDetail(detail, item).notification_type).toBe(
      'system'
    );
  });
});

describe('isCampaignRewardNotification', () => {
  it('treats an activity reward like a changelog detail', () => {
    expect(
      isCampaignRewardNotification({
        notification_type: 'activity',
        tags: ['activity_reward'],
      })
    ).toBe(true);
    expect(
      isCampaignRewardNotification({
        notification_type: 'system',
        tags: ['changelog'],
      })
    ).toBe(false);
  });
});
