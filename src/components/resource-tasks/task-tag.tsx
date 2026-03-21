import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { TaskType } from '@/interface.ts';
import { taskTypeConfig } from '@/page/sidebar/switcher/manage/tasks/task-type-badge.tsx';

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
      className="h-6 rounded-[8px] gap-[2px] py-0 px-2 text-xs text-neutral-600 bg-transparent  dark:text-white"
    >
      <config.icon />
      {t(config.labelKey)}
    </Button>
  );
}
