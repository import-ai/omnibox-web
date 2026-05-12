import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { TaskType } from '@/interface.ts';
import { taskTypeConfig } from '@/page/settings/tabs/members/tasks/task-type-badge.tsx';

interface TaskTagProps {
  type: TaskType;
  variant?: 'outline';
}

export function TaskTag({ type, variant = 'outline' }: TaskTagProps) {
  const { t } = useTranslation();
  const config = taskTypeConfig[type];

  if (!config) {
    return null;
  }

  return (
    <Button
      variant={variant}
      className="h-6 gap-0.5 rounded-lg bg-transparent px-2 py-0 text-xs text-neutral-600 dark:text-white"
    >
      <config.icon />
      {t(config.labelKey)}
    </Button>
  );
}
