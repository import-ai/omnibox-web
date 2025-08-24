import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { TaskStatus } from '@/interface.ts';

export const statusConfig: Record<
  TaskStatus,
  {
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    className: string;
  }
> = {
  pending: {
    variant: 'secondary' as const,
    className: 'bg-gray-100 text-gray-800',
  },
  running: {
    variant: 'default' as const,
    className: 'bg-blue-100 text-blue-800',
  },
  finished: {
    variant: 'default' as const,
    className: 'bg-green-100 text-green-800',
  },
  canceled: {
    variant: 'outline' as const,
    className: 'bg-yellow-100 text-yellow-800',
  },
  error: {
    variant: 'destructive' as const,
    className: 'bg-red-100 text-red-800',
  },
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const { t } = useTranslation();
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={config.className}>
      {t(`tasks.status_${status}`)}
    </Badge>
  );
}
