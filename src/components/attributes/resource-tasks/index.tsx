import { ListChecks, ListVideo } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DoneIcon } from '@/assets/icons/DoneIcon';
import { ProgressIcon } from '@/assets/icons/ProgressIcon';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Spinner } from '@/components/ui/Spinner';
import { RESOURCE_TASKS_INTERVAL } from '@/const.ts';
import useApp from '@/hooks/useApp';
import { Resource, Task } from '@/interface';
import { http } from '@/lib/request';

import { ATTRIBUTE_STYLES } from '../constants';
import { CONTENT_MODIFYING_FUNCTIONS, DISPLAY_FUNCTIONS } from './const';
import { TaskTag } from './TaskTag';
import { hasActiveContentModifyingTasks } from './utils';

interface ResourceTasksProps {
  resource: Resource;
  namespaceId: string;
  onResource: (resource: Resource) => void;
}

export default function ResourceTasks({
  resource,
  namespaceId,
  onResource,
}: ResourceTasksProps) {
  const { t } = useTranslation();
  const app = useApp();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshResource = useCallback(async () => {
    try {
      const resourceResponse = await http.get(
        `/namespaces/${namespaceId}/resources/${resource.id}`
      );
      if (resourceResponse) {
        onResource(resourceResponse);
        app.fire('update_resource', resourceResponse);
      }
    } catch (err) {
      console.error('Failed to refresh resource:', err);
    }
  }, [app, namespaceId, onResource, resource.id]);

  const shouldRefreshResource = useCallback(
    (taskList: Task[]) => {
      const resourceUpdatedAt = Date.parse(resource.updated_at || '') || 0;

      return taskList.some(task => {
        const taskEndedAt = Date.parse(task.ended_at || '');
        return (
          CONTENT_MODIFYING_FUNCTIONS.includes(task.function) &&
          task.status !== 'running' &&
          task.status !== 'pending' &&
          Number.isFinite(taskEndedAt) &&
          taskEndedAt >= resourceUpdatedAt
        );
      });
    },
    [resource.updated_at]
  );

  const fetchTasks = useCallback(async () => {
    try {
      setError(null);
      const response = await http.get(
        `/namespaces/${namespaceId}/resources/${resource.id}/tasks`
      );
      const nextTasks = response || [];
      setTasks(nextTasks);
      return nextTasks;
    } catch (err) {
      setError(t('tasks.fetch_error'));
      console.error('Fetch resource tasks error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [namespaceId, resource.id, t]);

  // Initial fetch
  useEffect(() => {
    fetchTasks().then(nextTasks => {
      if (shouldRefreshResource(nextTasks)) {
        refreshResource();
      }
    });
  }, [fetchTasks, refreshResource, shouldRefreshResource]);

  // Auto-refresh logic for content-modifying tasks
  useEffect(() => {
    if (!hasActiveContentModifyingTasks(tasks)) {
      return;
    }

    const interval = setInterval(async () => {
      const previousActiveTasks = tasks.filter(
        task =>
          CONTENT_MODIFYING_FUNCTIONS.includes(task.function) &&
          (task.status === 'running' || task.status === 'pending')
      );

      try {
        const updatedTasks = await fetchTasks();

        // Check if any previously active content-modifying task has finished
        const wasActiveNowFinished = previousActiveTasks.some(prevTask => {
          const updatedTask = updatedTasks.find(
            (t: Task) => t.id === prevTask.id
          );
          return (
            updatedTask &&
            CONTENT_MODIFYING_FUNCTIONS.includes(updatedTask.function) &&
            updatedTask.status !== 'running' &&
            updatedTask.status !== 'pending'
          );
        });

        if (wasActiveNowFinished) {
          refreshResource();
        }
      } catch (err) {
        console.error('Failed to check task updates:', err);
      }
    }, RESOURCE_TASKS_INTERVAL);

    return () => clearInterval(interval);
  }, [tasks, fetchTasks, refreshResource]);

  if (loading) {
    return (
      <div className={ATTRIBUTE_STYLES.container}>
        <div className={ATTRIBUTE_STYLES.containerLabel}>
          <ListChecks className={ATTRIBUTE_STYLES.icon} />
          <span className={ATTRIBUTE_STYLES.label}>
            {t('tasks.related_tasks')}
          </span>
        </div>
        <span className={`flex items-center ${ATTRIBUTE_STYLES.value} h-7`}>
          <Spinner />
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={ATTRIBUTE_STYLES.container}>
        <div className={ATTRIBUTE_STYLES.containerLabel}>
          <ListChecks className={ATTRIBUTE_STYLES.icon} />
          <span className={ATTRIBUTE_STYLES.label}>
            {t('tasks.related_tasks')}
          </span>
        </div>
        <span className="text-sm text-red-600">{error}</span>
      </div>
    );
  }

  if (tasks.length === 0) {
    return null;
  }

  // Show only tasks with specified functions that are recent or active
  const relevantTasks = tasks.filter(task => {
    const isDisplayFunction = DISPLAY_FUNCTIONS.includes(task.function);
    const isActive = task.status === 'running' || task.status === 'pending';
    const isRecent =
      new Date(task.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000);
    return isDisplayFunction && (isActive || isRecent);
  });

  if (relevantTasks.length === 0) {
    return null;
  }

  // If all tasks finished, display nothing
  if (!hasActiveContentModifyingTasks(relevantTasks)) {
    return null;
  }

  // Group tasks by status
  const pendingTasks = relevantTasks.filter(task => task.status === 'pending');
  const runningTasks = relevantTasks.filter(task => task.status === 'running');
  const finishedTasks = relevantTasks.filter(
    task => task.status === 'finished'
  );

  return (
    <div className={ATTRIBUTE_STYLES.container}>
      <div className={ATTRIBUTE_STYLES.containerLabel}>
        <ListChecks className={ATTRIBUTE_STYLES.icon} />
        <span className={ATTRIBUTE_STYLES.label}>
          {t('tasks.related_tasks')}
        </span>
      </div>
      <span className="flex h-7 items-center text-foreground">
        <span className="flex gap-2">
          {pendingTasks.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  className="h-6 gap-0.5 rounded-lg border border-neutral-500 bg-transparent px-2 py-0 text-xs text-neutral-500 focus-visible:outline-none dark:border-neutral-300 dark:text-neutral-300"
                >
                  <ListVideo />
                  {t('tasks.status_label_pending')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="bottom"
                className="flex max-h-[90px] min-w-[93px] flex-col gap-[5px] overflow-y-auto p-[3px]"
              >
                {pendingTasks.map(task => (
                  <DropdownMenuItem
                    key={task.id}
                    className="p-0 focus:bg-transparent"
                  >
                    <TaskTag type={task.function as any} />
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {runningTasks.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  className="h-6 gap-0.5 rounded-lg border border-blue-500 bg-transparent px-2 py-0 text-xs text-blue-500 dark:border-blue-400 dark:text-blue-400"
                >
                  <ProgressIcon />
                  {t('tasks.status_label_running')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="bottom"
                className="flex max-h-[90px] min-w-[93px] flex-col gap-[5px] overflow-y-auto p-[3px]"
              >
                {runningTasks.map(task => (
                  <DropdownMenuItem
                    key={task.id}
                    className="p-0 focus:bg-transparent"
                  >
                    <TaskTag type={task.function as any} />
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {finishedTasks.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  className="h-6 gap-0.5 rounded-lg border border-green-600 bg-transparent px-2 py-0 text-xs text-green-600 dark:border-green-500 dark:text-green-500"
                >
                  <DoneIcon />
                  {t('tasks.status_label_finished')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="bottom"
                className="flex max-h-[90px] min-w-[93px] flex-col gap-[5px] overflow-y-auto p-[3px]"
              >
                {finishedTasks.map(task => (
                  <DropdownMenuItem
                    key={task.id}
                    className="p-0 focus:bg-transparent"
                  >
                    <TaskTag type={task.function as any} />
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </span>
        {hasActiveContentModifyingTasks(relevantTasks) && (
          <Spinner className="ml-2" />
        )}
      </span>
    </div>
  );
}
