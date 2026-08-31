import { Check, LoaderCircle, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { ConversationShareChannel } from '@/service/conversationShare';

export function ConversationShareSelectionControl({
  state,
}: {
  state: 'checked' | 'indeterminate' | 'unchecked';
}) {
  return (
    <span
      className={cn(
        'flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border',
        state === 'unchecked'
          ? 'border-neutral-300 bg-white dark:border-neutral-600 dark:bg-transparent'
          : 'border-[#3D86F9] bg-[#3D86F9] text-white'
      )}
    >
      {state === 'checked' && <Check className="size-2.5" strokeWidth={3} />}
      {state === 'indeterminate' && (
        <Minus className="size-2.5" strokeWidth={3} />
      )}
    </span>
  );
}

export function ConversationShareActions({
  allSelected,
  canShare,
  isSharing,
  onClose,
  onShare,
  onToggleAll,
  selectedCount,
  sharingChannel,
}: {
  allSelected: boolean;
  canShare: boolean;
  isSharing: boolean;
  onClose: () => void;
  onShare: (channel: ConversationShareChannel) => void;
  onToggleAll: () => void;
  selectedCount: number;
  sharingChannel: ConversationShareChannel | null;
}) {
  const { t } = useTranslation();
  const disabled = !canShare || isSharing;
  const checkboxState = allSelected
    ? 'checked'
    : selectedCount > 0
      ? 'indeterminate'
      : 'unchecked';

  return (
    <section className="h-20 shrink-0 border-t bg-white dark:bg-background">
      <div className="mx-auto flex h-full max-w-[800px] items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-3 text-sm">
          <button
            aria-checked={
              allSelected ? true : selectedCount > 0 ? 'mixed' : false
            }
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onToggleAll}
            role="checkbox"
            type="button"
          >
            <ConversationShareSelectionControl state={checkboxState} />
            <span>{t('chat.share.selectAll')}</span>
          </button>
          <div aria-hidden="true" className="h-4 w-px shrink-0 bg-border" />
          <span className="truncate text-[#292B33] dark:text-foreground">
            {t('chat.share.selectionSummary', { count: selectedCount })}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Button
            className="h-[26px] w-auto gap-2.5 rounded-lg border-[#D6DBE3] bg-white px-3 py-[5px] text-[13px] leading-4 shadow-none hover:bg-neutral-50 dark:border-neutral-600 dark:bg-transparent dark:hover:bg-accent"
            disabled={isSharing}
            onClick={onClose}
            size="sm"
            type="button"
            variant="outline"
          >
            {t('cancel')}
          </Button>
          <Button
            className="h-[26px] w-auto gap-2.5 rounded-lg bg-[#121316] px-3 py-[5px] text-[13px] leading-4 text-white shadow-none hover:bg-[#292B33] dark:bg-white dark:text-[#121316] dark:hover:bg-neutral-200"
            disabled={disabled}
            onClick={() => onShare('copy_link')}
            size="sm"
            type="button"
          >
            {sharingChannel === 'copy_link' && (
              <LoaderCircle className="animate-spin" />
            )}
            {t('chat.share.copyLink')}
          </Button>
        </div>
      </div>
    </section>
  );
}
