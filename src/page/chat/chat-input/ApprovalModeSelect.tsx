import { Check, ChevronDown, Hand, ShieldCheck, ShieldX } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { onOverlayClose, trackButtonClick } from '@/lib/trackButtonClick';
import { cn } from '@/lib/utils';

import { composerControlHoverClass } from './composerControlClass';
import type { ApprovalMode } from './types';

interface ApprovalModeSelectProps {
  approvalMode: ApprovalMode;
  setApprovalMode: (mode: ApprovalMode) => void;
}

export default function ApprovalModeSelect({
  approvalMode,
  setApprovalMode,
}: ApprovalModeSelectProps) {
  const { t } = useTranslation();
  const options = [
    { value: 'manual', Icon: Hand },
    { value: 'auto_approve', Icon: ShieldCheck },
    { value: 'auto_reject', Icon: ShieldX },
  ] as const;
  const TriggerIcon = options.find(
    option => option.value === approvalMode
  )?.Icon;
  const modeLabel = t(`chat.decision.mode.${approvalMode}`);

  return (
    <DropdownMenu>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              onClick={() => trackButtonClick('chat_approval_open')}
              type="button"
              aria-label={modeLabel}
              className={cn(
                'inline-flex h-8 w-12 shrink-0 items-center justify-center gap-1 rounded-full p-0 text-xs font-normal @min-[480px]/composer-toolbar:w-auto @min-[480px]/composer-toolbar:gap-2 @min-[480px]/composer-toolbar:pl-2 @min-[480px]/composer-toolbar:pr-1',
                composerControlHoverClass
              )}
            >
              {TriggerIcon && <TriggerIcon aria-hidden className="size-4" />}
              <span className="hidden @min-[480px]/composer-toolbar:block">
                {modeLabel}
              </span>
              <ChevronDown
                aria-hidden
                className="size-3 @min-[480px]/composer-toolbar:size-4"
              />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">{modeLabel}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        onPointerDownOutside={onOverlayClose('chat_overlay_close', 'approval')}
        side="top"
        align="start"
        className="w-72 rounded-xl p-1.5"
      >
        {options.map(({ value, Icon }) => (
          <DropdownMenuItem
            key={value}
            className="grid cursor-pointer grid-cols-[24px_minmax(0,1fr)_18px] items-center gap-2 rounded-md px-2 py-2"
            onClick={() => {
              trackButtonClick('chat_approval_select', { mode: value });
              setApprovalMode(value);
            }}
          >
            <Icon className="size-4 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block text-sm font-medium leading-5">
                {t(`chat.decision.mode.${value}`)}
              </span>
              <span className="block whitespace-normal text-xs leading-4 text-muted-foreground">
                {t(`chat.decision.mode_description.${value}`)}
              </span>
            </span>
            {approvalMode === value && (
              <Check className="size-4 text-blue-500! [&_path]:text-blue-500!" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
