import { useCallback, useEffect, useState } from 'react';

import useApp from '@/hooks/use-app';

const notificationUnreadUpdatedEvent = 'notification:unread:updated';

let notificationUnreadCount = 0;

export function useNotificationUnread() {
  const app = useApp();
  const [unreadCount, setLocalUnreadCount] = useState(notificationUnreadCount);

  const setUnreadCount = useCallback(
    (nextCount: number) => {
      if (nextCount === notificationUnreadCount) {
        return;
      }

      notificationUnreadCount = nextCount;
      app.fire(notificationUnreadUpdatedEvent, nextCount);
    },
    [app]
  );

  useEffect(() => {
    return app.on(notificationUnreadUpdatedEvent, (nextCount: number) => {
      notificationUnreadCount = nextCount;
      setLocalUnreadCount(nextCount);
    });
  }, [app]);

  return {
    unreadCount,
    setUnreadCount,
  };
}
