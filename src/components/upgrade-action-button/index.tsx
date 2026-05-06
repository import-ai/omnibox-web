import type { ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { getUpgradeLink } from '@/lib/upgrade-link';

type I18nValues = Record<string, unknown>;
type TooltipSide = ComponentPropsWithoutRef<typeof TooltipContent>['side'];

interface UpgradeTrialUsageTooltipProps {
  textKey: string;
  textValues?: I18nValues;
  tooltipItems: string[];
  tooltipSide?: TooltipSide;
  triggerClassName?: string;
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
}: UpgradeTrialUsageTooltipProps) {
  const { t } = useTranslation();

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <span className={triggerClassName}>{t(textKey, textValues)}</span>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide}>
        {tooltipItems.map((item, index) => {
          return <p key={`${item}-${index}`}>{item}</p>;
        })}
      </TooltipContent>
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
        <span className="text-muted-foreground cursor-pointer">{button}</span>
      </TooltipTrigger>
      <TooltipContent>{disabledReason}</TooltipContent>
    </Tooltip>
  );
}
