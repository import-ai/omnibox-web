import { CancelStatus } from '@/assets/icons/cancelStatus';
import { CompletedStatus } from '@/assets/icons/completedStatus';
import { ErrorStatus } from '@/assets/icons/errorStatus';
import { InProgressStatus } from '@/assets/icons/inProgressStatus';
import { QueueStatus } from '@/assets/icons/queueStatus';
import { TaskStatus } from '@/interface.ts';

export const statusConfig: Record<
  TaskStatus,
  {
    icon: React.ComponentType<{
      className?: string;
      style?: React.CSSProperties;
    }>;
    color: string;
    bgColor?: string;
  }
> = {
  pending: {
    icon: QueueStatus,
    color: '#737373',
  },
  running: {
    icon: InProgressStatus,
    color: '#60a5fa',
    bgColor: '#60a5fa',
  },
  finished: {
    icon: CompletedStatus,
    color: '#22c55e',
    bgColor: '#22c55e',
  },
  canceled: {
    icon: CancelStatus,
    color: '#facc15',
    bgColor: '#facc15',
  },
  error: {
    icon: ErrorStatus,
    color: '#ef4444',
    bgColor: '#ef4444',
  },
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  if (status === 'pending') {
    return <Icon className="size-5 animate-spin" />;
  }

  return <Icon className="size-5" />;
}
