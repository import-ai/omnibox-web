import { Task, TaskStatus } from '@/interface';
import { statusConfig } from '@/page/settings/tabs/members/tasks/TaskStatusBadge';

import {
  CONTENT_MODIFYING_FUNCTIONS,
  FAILED_TASK_STATUSES,
  PARSE_FUNCTIONS,
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

export const getFailedTasks = (taskList: Task[]): Task[] => {
  return taskList.filter(task => FAILED_TASK_STATUSES.includes(task.status));
};

/**
 * Whether the resource's parsing is known to have failed: the most recent
 * parsing attempt ended in a failure and nothing is running to supersede it.
 * Mirrors the eligibility the retry-parse endpoint enforces.
 */
export const hasFailedParse = (taskList: Task[]): boolean => {
  const [latest] = taskList
    .filter(task => PARSE_FUNCTIONS.includes(task.function))
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  return !!latest && FAILED_TASK_STATUSES.includes(latest.status);
};
