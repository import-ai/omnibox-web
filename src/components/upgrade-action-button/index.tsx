import type { ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { trackButtonClick } from '@/lib/trackButtonClick';
import { getUpgradeLink } from '@/lib/upgradeLink';
import { cn } from '@/lib/utils';

type I18nValues = Record<string, unknown>;
type TooltipSide = ComponentPropsWithoutRef<typeof TooltipContent>['side'];

interface UpgradeUsageTooltipProps {
  textKey: string;
  textValues?: I18nValues;
  tooltipItems: string[];
  tooltipSide?: TooltipSide;
  triggerClassName?: string;
  trackName?: string;
}

interface UpgradeActionButtonProps {
  namespaceId?: string;
  hasPermission?: boolean;
  disabledReason?: string;
  /** Keep the button clickable for members and route the press to a paywall. */
  onDeniedPress?: () => void;
  className?: string;
  labelKey?: string;
  trackName?: string;
  entry?: string;
}

export function UpgradeUsageTooltip({
  textKey,
  textValues,
  tooltipItems,
  tooltipSide = 'left',
  triggerClassName = 'text-muted-foreground cursor-default',
  trackName,
}: UpgradeUsageTooltipProps) {
  const { t } = useTranslation();

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(triggerClassName, 'text-sm')}
          onClick={() => {
            if (trackName) trackButtonClick(trackName);
          }}
        >
          {t(textKey, textValues)}
        </button>
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
  onDeniedPress,
  className = 'text-sm h-5',
  labelKey = 'namespace.upgrade',
  trackName,
  entry,
}: UpgradeActionButtonProps) {
  const { t, i18n } = useTranslation();

  const handleClick = () => {
    if (!hasPermission) {
      onDeniedPress?.();
      return;
    }
    if (!namespaceId) {
      return;
    }

    window.open(getUpgradeLink(i18n, namespaceId, entry), '_blank');
  };

  const button = (
    <Button
      type="button"
      variant="default"
      size="sm"
      className={className}
      trackName={trackName}
      onClick={handleClick}
      disabled={!hasPermission && !onDeniedPress}
    >
      {t(labelKey)}
    </Button>
  );

  if (hasPermission || !disabledReason || onDeniedPress) {
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
