import { ListChecks, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Spinner } from '@/components/ui/Spinner';
import { Resource } from '@/interface';

import { ATTRIBUTE_STYLES } from '../constants';
import { DISPLAY_FUNCTIONS, RETRYABLE_TASK_STATUSES } from './const';
import { useResourceTasks } from './ResourceTasksContext';
import { TaskTag } from './TaskTag';
import {
  getCanceledTasks,
  getFailedTasks,
  getTaskBadgeConfig,
  hasActiveContentModifyingTasks,
} from './utils';

// Props stay for the Attributes call site; state lives in ResourceTasksProvider.
interface ResourceTasksProps {
  resource: Resource;
  namespaceId: string;
  onResource: (resource: Resource) => void;
}

export default function ResourceTasks({}: ResourceTasksProps) {
  const { t } = useTranslation();
  const { tasks, loading, error, retrying, hasRetryable, retry } =
    useResourceTasks();

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
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
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

  const pendingTasks = relevantTasks.filter(task => task.status === 'pending');
  const runningTasks = relevantTasks.filter(task => task.status === 'running');
  const finishedTasks = relevantTasks.filter(
    task => task.status === 'finished'
  );
  // Resolved against the full task list so a retry hides the task it replaced
  const failedTasks = getFailedTasks(relevantTasks, tasks);
  const canceledTasks = getCanceledTasks(relevantTasks, tasks);
  const PendingIcon = getTaskBadgeConfig('pending').icon;
  const RunningIcon = getTaskBadgeConfig('running').icon;
  const FinishedIcon = getTaskBadgeConfig('finished').icon;
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
                  className="h-6 gap-1 rounded-lg border border-border bg-transparent px-2 py-0 text-xs text-muted-foreground"
                >
                  <PendingIcon className="size-4" />
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
                  className="h-6 gap-1 rounded-lg border border-border bg-transparent px-2 py-0 text-xs text-muted-foreground"
                >
                  <RunningIcon className="size-4" />
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
                  className="h-6 gap-1 rounded-lg border border-border bg-transparent px-2 py-0 text-xs text-muted-foreground"
                >
                  <FinishedIcon className="size-4" />
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
                  className="h-6 gap-1 rounded-lg border border-border bg-transparent px-2 py-0 text-xs text-muted-foreground"
                >
                  <FailedIcon className="size-4" />
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
                  className="h-6 gap-1 rounded-lg border border-border bg-transparent px-2 py-0 text-xs text-muted-foreground"
                >
                  <CanceledIcon className="size-4" />
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
          {hasRetryable && (
            <Button
              variant="secondary"
              disabled={retrying}
              onClick={() => {
                void retry();
              }}
              className="h-6 gap-1 rounded-lg border border-border bg-transparent px-2 py-0 text-xs text-muted-foreground"
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
