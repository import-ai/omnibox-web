import { useTranslation } from 'react-i18next';

import { Namespace } from '@/interface';
import { cn } from '@/lib/utils';

interface NamespaceTierBadgeProps {
  namespace: Pick<Namespace, 'expired' | 'tier'>;
  className?: string;
}

export function NamespaceTierBadge({
  namespace,
  className,
}: NamespaceTierBadgeProps) {
  const { t } = useTranslation();
  const { expired, tier } = namespace;

  if (!expired && !tier) {
    return null;
  }

  const label = expired
    ? t('namespace.tier.expired')
    : t(`namespace.tier.${tier}`);

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none h-[18px]',
        expired
          ? 'bg-slate-500 text-white'
          : tier === 'premium'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-zinc-500',
        className
      )}
    >
      {label}
    </span>
  );
}
