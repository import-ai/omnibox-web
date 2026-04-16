import { Inbox } from 'lucide-react';

interface NotificationEmptyStateProps {
  label: string;
}

export function NotificationEmptyState({ label }: NotificationEmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
      <Inbox
        size={96}
        color="currentColor"
        strokeWidth={1}
        className="text-muted-foreground/40"
      />
      <div className="text-lg font-normal leading-10">{label}</div>
    </div>
  );
}
