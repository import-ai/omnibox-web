import type { MouseEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

import { ConversationShareSelectionControl } from './ConversationShareControls';

export function ConversationShareMessageRow({
  children,
  groupId,
  selected,
  onToggle,
}: {
  children: ReactNode;
  groupId: string;
  selected: boolean;
  onToggle: (groupId: string) => void;
}) {
  const { t } = useTranslation();
  const toggle = (event?: MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    onToggle(groupId);
  };

  return (
    <div
      aria-checked={selected}
      aria-label={t('chat.share.toggleGroup')}
      className={cn(
        '-mx-2 grid cursor-pointer grid-cols-[32px_minmax(0,1fr)] rounded-md py-2 pr-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
        selected && 'bg-slate-50 dark:bg-neutral-800/70'
      )}
      onClick={toggle}
      onKeyDown={event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onToggle(groupId);
      }}
      role="checkbox"
      tabIndex={0}
    >
      <div className="relative self-stretch">
        <div
          className={cn(
            'flex h-8 items-start justify-center pt-2',
            selected && 'sticky top-0'
          )}
        >
          <ConversationShareSelectionControl
            state={selected ? 'checked' : 'unchecked'}
          />
        </div>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
