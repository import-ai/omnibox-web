import { Task, TaskStatus } from '@/interface';
import { statusConfig } from '@/page/settings/tabs/members/tasks/TaskStatusBadge';

import {
  CONTENT_MODIFYING_FUNCTIONS,
  FAILED_TASK_STATUSES,
  RETRYABLE_TASK_STATUSES,
} from './const';

export const formatFunction = (
  functionName: string,
  t: (key: string) => string
): string => {
  const translationKey = `tasks.functions.${functionName}`;
  const translated = t(translationKey);
  return translated !== translationKey ? translated : functionName;
};

export const getTaskBadgeConfig = (status: TaskStatus) => {
  return statusConfig[status];
};

export const hasActiveContentModifyingTasks = (taskList: Task[]): boolean => {
  return taskList.some(
    task =>
      CONTENT_MODIFYING_FUNCTIONS.includes(task.function) &&
      (task.status === 'running' || task.status === 'pending')
  );
};

/**
 * Ids of failures that a later task was emitted to replace.
 *
 * The backend stamps `retried_from_task_id` on every task it emits from a
 * retry, so supersession is an exact pointer, never a guess: a failure that was
 * never retried stays visible no matter what else ran afterwards.
 */
export const getSupersededTaskIds = (taskList: Task[]): Set<string> => {
  return new Set(
    taskList
      .map(task => task.retried_from_task_id)
      .filter((id): id is string => !!id)
  );
};

/**
 * Tasks in one of `statuses` that no retry has replaced.
 *
 * Supersession is resolved against `allTasks`, which must be the full task
 * list. Resolving it against an already display-filtered `taskList` would miss
 * a retry the display filter dropped and leave the stale task on screen.
 */
const getUnretriedTasks = (
  taskList: Task[],
  statuses: TaskStatus[],
  allTasks: Task[]
): Task[] => {
  const superseded = getSupersededTaskIds(allTasks);
  return taskList.filter(
    task => statuses.includes(task.status) && !superseded.has(task.id)
  );
};

/** Failures still worth showing: the ones no retry has replaced. */
export const getFailedTasks = (
  taskList: Task[],
  allTasks: Task[] = taskList
): Task[] => getUnretriedTasks(taskList, FAILED_TASK_STATUSES, allTasks);

/** Canceled runs still worth showing: the ones no retry has replaced. */
export const getCanceledTasks = (
  taskList: Task[],
  allTasks: Task[] = taskList
): Task[] => getUnretriedTasks(taskList, ['canceled'], allTasks);

/** Everything a retry would re-run: unretried failures and cancellations. */
export const getRetryableTasks = (
  taskList: Task[],
  allTasks: Task[] = taskList
): Task[] => getUnretriedTasks(taskList, RETRYABLE_TASK_STATUSES, allTasks);

/**
 * Whether the resource has anything to retry: any failed or canceled task, of
 * any function, that no retry has already replaced. Mirrors the eligibility the
 * retry endpoint enforces.
 */
export const hasRetryableTasks = (taskList: Task[]): boolean => {
  return getRetryableTasks(taskList).length > 0;
};
