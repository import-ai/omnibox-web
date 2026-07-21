import type { NotificationDetail, NotificationItem } from './types';
import { mergeNotificationDetail } from './utils';

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
