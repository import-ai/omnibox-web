import { Inbox } from 'lucide-react';

interface NotificationEmptyStateProps {
  label: string;
}

export function NotificationEmptyState({ label }: NotificationEmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
      <Inbox
        size={96}
        strokeWidth={1}
        className="text-neutral-300 dark:text-neutral-400"
      />
      <div className="text-lg font-normal leading-10">{label}</div>
    </div>
  );
}
