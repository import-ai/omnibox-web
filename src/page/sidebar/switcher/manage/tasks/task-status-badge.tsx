import { CancelStatus } from '@/assets/icons/cancelStatus';
import { CompletedStatus } from '@/assets/icons/completedStatus';
import { ErrorStatus } from '@/assets/icons/errorStatus';
import { InProgressStatus } from '@/assets/icons/inProgressStatus';
import { QueueStatus } from '@/assets/icons/queueStatus';
import { TimeoutStatus } from '@/assets/icons/timeoutStatus';
import { TaskStatus } from '@/interface.ts';
import { cn } from '@/lib/utils';

export const statusConfig: Record<
  TaskStatus,
  {
    icon: React.ComponentType<{
      className?: string;
    }>;
  }
> = {
  pending: {
    icon: QueueStatus,
  },
  running: {
    icon: InProgressStatus,
  },
  finished: {
    icon: CompletedStatus,
  },
  canceled: {
    icon: CancelStatus,
  },
  error: {
    icon: ErrorStatus,
  },
  timeout: {
    icon: TimeoutStatus,
  },
  insufficient_quota: {
    icon: ErrorStatus,
  },
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Icon className={cn('size-5', status === 'pending' && 'animate-spin')} />
  );
}
