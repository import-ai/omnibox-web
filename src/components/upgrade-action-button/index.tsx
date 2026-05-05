import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { getUpgradeLink } from '@/lib/upgrade-link';

interface UpgradeActionButtonProps {
  namespaceId?: string;
  hasPermission?: boolean;
  disabledReason?: string;
  className?: string;
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
