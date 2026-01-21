import { useTranslation } from 'react-i18next';

interface IProps {
  expireDate: Date;
}

const calculateDaysRemaining = (expire: Date) => {
  const now = new Date();
  const expireDateObj = new Date(expire);
  const diffTime = expireDateObj.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const formattedDate = `${expireDateObj.getFullYear()}/${String(expireDateObj.getMonth() + 1).padStart(2, '0')}/${String(expireDateObj.getDate()).padStart(2, '0')}`;

  return { days: diffDays, date: formattedDate };
};

export function Expiration({ expireDate }: IProps) {
  const { t } = useTranslation();
  const expirationInfo = calculateDaysRemaining(expireDate);

  return (
    <div className="flex gap-0.5 text-xs mt-2 pb-1">
      <span className="font-semibold text-foreground">
        {t('quota.validity_period')}
      </span>
      <span className="text-muted-foreground">
        {t('quota.days_remaining', {
          days: expirationInfo.days,
          date: expirationInfo.date,
        })}
      </span>
    </div>
  );
}
