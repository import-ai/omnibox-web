import { useCallback, useEffect, useRef, useState } from 'react';

import { RESOURCE_TASKS_REFRESH_EVENT } from '@/components/attributes/resource-tasks/const';
import { hasRetryableTasks } from '@/components/attributes/resource-tasks/utils';
import useApp from '@/hooks/useApp';
import { fetchResourceTasks } from '@/service/resource';

interface IProps {
  namespaceId: string;
  resourceId?: string;
  disabled?: boolean;
}

/**
 * Tells whether the resource has any failed or canceled task left to re-run, so
 * the toolbar can offer a retry only when there is something to retry. The
 * sidebar has no task status, which is why this lives on the resource page.
 */
export default function useResourceRetryableTasks(props: IProps) {
  const { namespaceId, resourceId, disabled = false } = props;
  const app = useApp();
  const mountedRef = useRef(false);
  const [retryable, onRetryable] = useState(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(() => {
    if (disabled || !namespaceId || !resourceId) {
      onRetryable(false);
      return;
    }
    fetchResourceTasks(namespaceId, resourceId, { mute: true })
      .then(tasks => {
        if (mountedRef.current) {
          onRetryable(hasRetryableTasks(tasks || []));
        }
      })
      .catch(() => undefined);
  }, [disabled, namespaceId, resourceId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // A retry from the task panel re-emits tasks and supersedes the ones this
  // entry offered, so the toolbar has to re-read them
  useEffect(() => {
    return app.on(RESOURCE_TASKS_REFRESH_EVENT, (id: string) => {
      if (id === resourceId) {
        refresh();
      }
    });
  }, [app, resourceId, refresh]);

  return { retryable };
}
