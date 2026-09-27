import { useTranslation } from 'react-i18next';

import { CancelStatus } from '@/assets/icons/CancelStatus';
import { CompletedStatus } from '@/assets/icons/CompletedStatus';
import { ErrorStatus } from '@/assets/icons/ErrorStatus';
import { InProgressStatus } from '@/assets/icons/InProgressStatus';
import { QueueStatus } from '@/assets/icons/QueueStatus';
import { TimeoutStatus } from '@/assets/icons/TimeoutStatus';
import { cn } from '@/lib/utils';

// Reuses the background task status icons so both lists read the same way.
const icons: Record<string, React.ComponentType<{ className?: string }>> = {
  queued: QueueStatus,
  accepted: QueueStatus,
  awaiting_approval: QueueStatus,
  approved: QueueStatus,
  running: InProgressStatus,
  cancel_requested: InProgressStatus,
  succeeded: CompletedStatus,
  failed: ErrorStatus,
  denied: CancelStatus,
  canceled: CancelStatus,
  timed_out: TimeoutStatus,
  unknown: ErrorStatus,
};

export function ExecutionStatusIcon({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const Icon = icons[status] ?? ErrorStatus;
  return <Icon className={cn('size-4 shrink-0', className)} />;
}

export default function ExecutionStatus({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <ExecutionStatusIcon status={status} />
      {t(`local_runtime.status.${status}`)}
    </span>
  );
}
