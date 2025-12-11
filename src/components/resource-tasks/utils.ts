import { Task, TaskStatus } from '@/interface';
import { statusConfig } from '@/page/sidebar/switcher/manage/tasks/task-status-badge';

import { CONTENT_MODIFYING_FUNCTIONS } from './const';

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
