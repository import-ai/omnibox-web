import { Check, Circle, Loader2, X } from 'lucide-react';

import { TaskStatus } from '@/interface.ts';

export const statusConfig: Record<
  TaskStatus,
  {
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    color: string;
    bgColor?: string;
  }
> = {
  pending: {
    icon: Loader2,
    color: '#9ca3af',
  },
  running: {
    icon: Circle,
    color: '#60a5fa',
    bgColor: '#60a5fa',
  },
  finished: {
    icon: Check,
    color: '#22c55e',
    bgColor: '#22c55e',
  },
  canceled: {
    icon: Circle,
    color: '#f59e0b',
    bgColor: '#f59e0b',
  },
  error: {
    icon: X,
    color: '#ef4444',
    bgColor: '#ef4444',
  },
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  if (status === 'running') {
    return (
      <div
        className="flex size-5 items-center justify-center rounded-full"
        style={{ backgroundColor: config.bgColor }}
      >
        <div className="size-1.5 rounded-full bg-white" />
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <Loader2
        className="size-5 animate-spin"
        style={{ color: config.color }}
      />
    );
  }

  if (status === 'finished') {
    return (
      <div
        className="flex size-5 items-center justify-center rounded-full"
        style={{ backgroundColor: config.bgColor }}
      >
        <Check className="size-3 text-white" strokeWidth={3} />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div
        className="flex size-5 items-center justify-center rounded-full"
        style={{ backgroundColor: config.bgColor }}
      >
        <X className="size-3 text-white" strokeWidth={3} />
      </div>
    );
  }

  if (status === 'canceled') {
    return (
      <div
        className="flex size-5 items-center justify-center rounded-full"
        style={{ backgroundColor: config.bgColor }}
      >
        <div className="h-[3px] w-2 rounded-sm bg-white" />
      </div>
    );
  }

  return <Icon className="size-5" style={{ color: config.color }} />;
}
