import { useTranslation } from 'react-i18next';

import { formatExpiration } from './utils';

interface IProps {
  basic: {
    expired: boolean;
    expire_date: string | null;
  };
  premium?: {
    expired: boolean;
    expire_date: string | null;
  };
}

export function Expiration({ basic, premium }: IProps) {
  const { t } = useTranslation();

  const active = premium && !premium.expired ? premium : basic;
  const label =
    premium && !premium.expired ? 'quota.premium_period' : 'quota.basic_period';
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span>
        {t(label)}
        {formatExpiration(active.expired, active.expire_date, t)}
      </span>
      <span>{t('quota.storage_separate')}</span>
    </div>
  );
}
