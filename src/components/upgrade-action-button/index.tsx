import type { ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/Popover';
import { getUpgradeLink } from '@/lib/upgradeLink';
import { cn } from '@/lib/utils';

type I18nValues = Record<string, unknown>;
type TooltipSide = ComponentPropsWithoutRef<typeof TooltipContent>['side'];

interface UpgradeTrialUsageTooltipProps {
  textKey: string;
  textValues?: I18nValues;
  tooltipItems: string[];
  tooltipSide?: TooltipSide;
  triggerClassName?: string;
  openOnClick?: boolean;
}

interface UpgradeActionButtonProps {
  namespaceId?: string;
  hasPermission?: boolean;
  disabledReason?: string;
  className?: string;
}

export function UpgradeTrialUsageTooltip({
  textKey,
  textValues,
  tooltipItems,
  tooltipSide = 'left',
  triggerClassName = 'text-muted-foreground cursor-default',
  openOnClick = false,
}: UpgradeTrialUsageTooltipProps) {
  const { t } = useTranslation();
  const trigger = (
    <button type="button" className={cn(triggerClassName, 'text-sm')}>
      {t(textKey, textValues)}
    </button>
  );
  const content = tooltipItems.map((item, index) => {
    return <p key={`${item}-${index}`}>{item}</p>;
  });

  if (openOnClick) {
    return (
      <Popover>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          side={tooltipSide}
          className="w-auto max-w-xs border-0 bg-primary px-3 py-1.5 text-xs text-primary-foreground dark:bg-neutral-800 dark:text-neutral-100"
        >
          {content}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent side={tooltipSide}>{content}</TooltipContent>
    </Tooltip>
  );
}

export function UpgradeActionButton({
  namespaceId,
  hasPermission = true,
  disabledReason,
  className = 'text-sm h-5',
}: UpgradeActionButtonProps) {
  const { t, i18n } = useTranslation();

  const handleClick = () => {
    if (!namespaceId || !hasPermission) {
      return;
    }

    window.open(getUpgradeLink(i18n, namespaceId), '_blank');
  };

  const button = (
    <Button
      type="button"
      variant="default"
      size="sm"
      className={className}
      onClick={handleClick}
      disabled={!hasPermission}
    >
      {t('namespace.upgrade')}
    </Button>
  );

  if (hasPermission || !disabledReason) {
    return button;
  }

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <span className="inline-flex text-muted-foreground cursor-pointer">
          {button}
        </span>
      </TooltipTrigger>
      <TooltipContent>{disabledReason}</TooltipContent>
    </Tooltip>
  );
}
