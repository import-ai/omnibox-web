import { ListChecks, ListVideo, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

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
import { fetchResource, retryResourceTasks } from '@/service/resource';

import { ATTRIBUTE_STYLES } from '../constants';
import {
  CONTENT_MODIFYING_FUNCTIONS,
  DISPLAY_FUNCTIONS,
  RETRYABLE_TASK_STATUSES,
} from './const';
import { TaskTag } from './TaskTag';
import {
  getCanceledTasks,
  getFailedTasks,
  getTaskBadgeConfig,
  hasActiveContentModifyingTasks,
  hasRetryableTasks,
} from './utils';

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
  const [retrying, setRetrying] = useState(false);

  const fetchTasks = async () => {
    try {
      setError(null);
      const response = await http.get(
        `/namespaces/${namespaceId}/resources/${resource.id}/tasks`
      );
      setTasks(response || []);
    } catch (err) {
      setError(t('tasks.fetch_error'));
      console.error('Fetch resource tasks error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await retryResourceTasks(namespaceId, resource.id);
      toast.success(t('actions.retry_success'));
      await fetchTasks();
      const updated = await fetchResource(namespaceId, resource.id);
      onResource(updated);
      app.fire('update_resource', updated);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('actions.retry_error'));
    } finally {
      setRetrying(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [resource.id, namespaceId]);

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

      await fetchTasks();

      // Fetch updated tasks to compare
      try {
        const response = await http.get(
          `/namespaces/${namespaceId}/resources/${resource.id}/tasks`
        );
        const updatedTasks = response || [];

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
          // Refresh the resource content
          try {
            const resourceResponse = await http.get(
              `/namespaces/${namespaceId}/resources/${resource.id}`
            );
            if (resourceResponse) {
              onResource(resourceResponse);
              // Fire event to update sidebar
              app.fire('update_resource', resourceResponse);
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
  }, [tasks, resource.id, namespaceId, onResource, app]);

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

  // Show only tasks with specified functions that are recent, active, failed or
  // canceled. Whatever a retry could re-run stays visible regardless of age:
  // the resource is still missing that work.
  const relevantTasks = tasks.filter(task => {
    const isDisplayFunction = DISPLAY_FUNCTIONS.includes(task.function);
    const isActive = task.status === 'running' || task.status === 'pending';
    const isRecent =
      new Date(task.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000);
    return (
      isDisplayFunction &&
      (isActive || isRecent || RETRYABLE_TASK_STATUSES.includes(task.status))
    );
  });

  if (relevantTasks.length === 0) {
    return null;
  }

  // Group tasks by status
  const pendingTasks = relevantTasks.filter(task => task.status === 'pending');
  const runningTasks = relevantTasks.filter(task => task.status === 'running');
  const finishedTasks = relevantTasks.filter(
    task => task.status === 'finished'
  );
  // Resolved against the full task list so a retry hides the task it replaced
  const failedTasks = getFailedTasks(relevantTasks, tasks);
  const canceledTasks = getCanceledTasks(relevantTasks, tasks);
  const canRetry = hasRetryableTasks(tasks);
  const FailedIcon = getTaskBadgeConfig(failedTasks[0]?.status || 'error').icon;
  const CanceledIcon = getTaskBadgeConfig('canceled').icon;

  // Nothing is running and nothing is left to re-run: the resource speaks for
  // itself
  if (
    !hasActiveContentModifyingTasks(relevantTasks) &&
    failedTasks.length === 0 &&
    canceledTasks.length === 0
  ) {
    return null;
  }

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
          {failedTasks.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  className="h-6 gap-0.5 rounded-lg border border-red-600 bg-transparent px-2 py-0 text-xs text-red-600 dark:border-red-500 dark:text-red-500"
                >
                  <FailedIcon className="size-3.5" />
                  {t('tasks.status_label_failed')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="bottom"
                className="flex max-h-[90px] min-w-[93px] flex-col gap-[5px] overflow-y-auto p-[3px]"
              >
                {failedTasks.map(task => (
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
          {canceledTasks.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  className="h-6 gap-0.5 rounded-lg border border-neutral-500 bg-transparent px-2 py-0 text-xs text-neutral-500 focus-visible:outline-none dark:border-neutral-300 dark:text-neutral-300"
                >
                  <CanceledIcon className="size-3.5" />
                  {t('tasks.status_label_canceled')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="bottom"
                className="flex max-h-[90px] min-w-[93px] flex-col gap-[5px] overflow-y-auto p-[3px]"
              >
                {canceledTasks.map(task => (
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
          {canRetry && (
            <Button
              variant="secondary"
              disabled={retrying}
              onClick={handleRetry}
              className="h-6 gap-0.5 rounded-lg border border-neutral-500 bg-transparent px-2 py-0 text-xs text-neutral-500 dark:border-neutral-300 dark:text-neutral-300"
            >
              {retrying ? <Spinner /> : <RefreshCw className="size-3" />}
              {t('common.retry')}
            </Button>
          )}
        </span>
        {hasActiveContentModifyingTasks(relevantTasks) && (
          <Spinner className="ml-2" />
        )}
      </span>
    </div>
  );
}
