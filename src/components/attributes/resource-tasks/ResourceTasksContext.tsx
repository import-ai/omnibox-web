import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { RESOURCE_TASKS_INTERVAL } from '@/const.ts';
import useApp from '@/hooks/useApp';
import { Resource, Task } from '@/interface';
import {
  fetchResource,
  fetchResourceTasks,
  retryResourceTasks,
} from '@/service/resource';

import {
  CONTENT_MODIFYING_FUNCTIONS,
  RESOURCE_TASKS_REFRESH_EVENT,
} from './const';
import { hasActiveContentModifyingTasks, hasRetryableTasks } from './utils';

export type ResourceTasksContextValue = {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  retrying: boolean;
  hasRetryable: boolean;
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
};

const ResourceTasksContext = createContext<ResourceTasksContextValue | null>(
  null
);

const emptyValue: ResourceTasksContextValue = {
  tasks: [],
  loading: false,
  error: null,
  retrying: false,
  hasRetryable: false,
  refresh: async () => undefined,
  retry: async () => undefined,
};

type ProviderProps = {
  namespaceId: string;
  resourceId?: string | null;
  resourceType?: string | null;
  onResource?: (resource: Resource) => void;
  children: ReactNode;
};

/**
 * Single owner of a resource's task list. The related-tasks panel and the
 * resource toolbar both read from here so a failure discovered by polling shows
 * the retry entry in both places without a page reload.
 */
export function ResourceTasksProvider({
  namespaceId,
  resourceId,
  resourceType,
  onResource,
  children,
}: ProviderProps) {
  const { t } = useTranslation();
  const app = useApp();
  const enabled =
    !!namespaceId &&
    !!resourceId &&
    (resourceType === 'file' || resourceType === 'link');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const tasksRef = useRef(tasks);
  const onResourceRef = useRef(onResource);
  const tRef = useRef(t);
  const appRef = useRef(app);
  tasksRef.current = tasks;
  onResourceRef.current = onResource;
  tRef.current = t;
  appRef.current = app;

  const refresh = useCallback(async () => {
    if (
      !namespaceId ||
      !resourceId ||
      !(resourceType === 'file' || resourceType === 'link')
    ) {
      setTasks([]);
      setLoading(false);
      setError(null);
      return;
    }
    try {
      setError(null);
      const response = await fetchResourceTasks(namespaceId, resourceId, {
        mute: true,
      });
      setTasks(response || []);
    } catch (err) {
      setError(tRef.current('tasks.fetch_error'));
      console.error('Fetch resource tasks error:', err);
    } finally {
      setLoading(false);
    }
  }, [namespaceId, resourceId, resourceType]);

  // Load once per resource identity. refresh is stable for that identity.
  useEffect(() => {
    setLoading(enabled);
    setTasks([]);
    setError(null);
    void refresh();
  }, [enabled, refresh]);

  useEffect(() => {
    if (!resourceId) {
      return;
    }
    return appRef.current.on(RESOURCE_TASKS_REFRESH_EVENT, (id: string) => {
      if (id === resourceId) {
        void refresh();
      }
    });
  }, [resourceId, refresh]);

  // Poll only while content-modifying work is active. Gate on a boolean so we
  // do not tear down/rebuild the interval on every task list rewrite.
  const shouldPoll = enabled && hasActiveContentModifyingTasks(tasks);
  useEffect(() => {
    if (!shouldPoll || !namespaceId || !resourceId) {
      return;
    }

    const interval = setInterval(async () => {
      const previousActiveTasks = tasksRef.current.filter(
        task =>
          CONTENT_MODIFYING_FUNCTIONS.includes(task.function) &&
          (task.status === 'running' || task.status === 'pending')
      );

      try {
        const updatedTasks =
          (await fetchResourceTasks(namespaceId, resourceId, {
            mute: true,
          })) || [];
        setTasks(updatedTasks);

        const wasActiveNowFinished = previousActiveTasks.some(prevTask => {
          const updatedTask = updatedTasks.find(t => t.id === prevTask.id);
          return (
            !!updatedTask &&
            CONTENT_MODIFYING_FUNCTIONS.includes(updatedTask.function) &&
            updatedTask.status !== 'running' &&
            updatedTask.status !== 'pending'
          );
        });

        const updateResource = onResourceRef.current;
        if (wasActiveNowFinished && updateResource) {
          try {
            const resourceResponse = await fetchResource(
              namespaceId,
              resourceId
            );
            if (resourceResponse) {
              updateResource(resourceResponse);
              appRef.current.fire('update_resource', resourceResponse);
            }
          } catch (err) {
            console.error('Failed to refresh resource:', err);
          }
        }
      } catch (err) {
        console.error('Failed to check task updates:', err);
      }
    }, RESOURCE_TASKS_INTERVAL);

    return () => clearInterval(interval);
  }, [shouldPoll, resourceId, namespaceId]);

  const retry = useCallback(async () => {
    if (!namespaceId || !resourceId || retrying) {
      return;
    }
    setRetrying(true);
    try {
      await retryResourceTasks(namespaceId, resourceId);
      toast.success(tRef.current('actions.retry_success'));
      // Keep the event for any stray listeners; the provider also refreshes
      // itself so both the panel and the toolbar drop superseded tasks.
      appRef.current.fire(RESOURCE_TASKS_REFRESH_EVENT, resourceId);
      await refresh();
      const updateResource = onResourceRef.current;
      if (updateResource) {
        const updated = await fetchResource(namespaceId, resourceId);
        updateResource(updated);
        appRef.current.fire('update_resource', updated);
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || tRef.current('actions.retry_error')
      );
    } finally {
      setRetrying(false);
    }
  }, [namespaceId, resourceId, retrying, refresh]);

  const value = useMemo<ResourceTasksContextValue>(
    () => ({
      tasks,
      loading,
      error,
      retrying,
      hasRetryable: hasRetryableTasks(tasks),
      refresh,
      retry,
    }),
    [tasks, loading, error, retrying, refresh, retry]
  );

  return (
    <ResourceTasksContext.Provider value={enabled ? value : emptyValue}>
      {children}
    </ResourceTasksContext.Provider>
  );
}

export function useResourceTasks(): ResourceTasksContextValue {
  return useContext(ResourceTasksContext) ?? emptyValue;
}
