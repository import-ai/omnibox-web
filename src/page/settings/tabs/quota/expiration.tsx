import i18next from 'i18next';
import { useTranslation } from 'react-i18next';
interface IProps {
  basic: {
    expired: boolean;
    expire_date: Date | null;
  };
  premium?: {
    expired: boolean;
    expire_date: Date | null;
  };
}

const formatExpiration = (expired: boolean, expireDate: Date | null) => {
  if (expireDate === null) {
    return i18next.t('namespace.tier.forever');
  }
  if (expired) {
    return i18next.t('namespace.tier.expired');
  }
  const now = new Date();
  const expireDateObj = new Date(expireDate);
  const diffTime = expireDateObj.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const formattedDate = `${expireDateObj.getFullYear()}/${String(expireDateObj.getMonth() + 1).padStart(2, '0')}/${String(expireDateObj.getDate()).padStart(2, '0')}`;
  return i18next.t('quota.days_remaining', {
    days: diffDays,
    date: formattedDate,
  });
};

export function Expiration({ basic, premium }: IProps) {
  const { t } = useTranslation();

  const basicText = formatExpiration(basic.expired, basic.expire_date);

  if (!premium) {
    return (
      <div className="pt-2 text-right text-xs">
        <span className="font-semibold text-foreground">
          {t('quota.basic_period')}
        </span>
        <span className="text-muted-foreground">{basicText}</span>
      </div>
    );
  }

  const premiumText = formatExpiration(premium.expired, premium.expire_date);

  return (
    <div className="pt-2 text-right text-xs">
      <span className="font-semibold text-foreground">
        {t('quota.premium_period')}
      </span>
      <span className="mr-4 text-muted-foreground">{premiumText}</span>
      <span className="font-semibold text-foreground">
        {t('quota.basic_period')}
      </span>
      <span className="text-muted-foreground">{basicText}</span>
    </div>
  );
}
