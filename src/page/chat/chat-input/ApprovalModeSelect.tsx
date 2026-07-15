import { Check, ChevronDown, Hand, ShieldCheck, ShieldX } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0 px-2 text-xs font-normal rounded-full md:pl-2 md:pr-1"
        >
          {TriggerIcon && <TriggerIcon className="size-4" />}
          <span className="hidden md:block">
            {t(`chat.decision.mode.${approvalMode}`)}
          </span>
          <ChevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        className="w-72 rounded-xl p-1.5"
      >
        {options.map(({ value, Icon }) => (
          <DropdownMenuItem
            key={value}
            className="grid cursor-pointer grid-cols-[24px_minmax(0,1fr)_18px] items-center gap-2 rounded-md px-2 py-2"
            onClick={() => setApprovalMode(value)}
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
              <Check className="size-4 text-muted-foreground" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
