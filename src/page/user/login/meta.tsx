import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function MetaPage() {
  const { t } = useTranslation();

  return (
    <div className="text-muted-foreground text-center text-xs text-balance">
      {t('login.agree_our_rule')}{' '}
      <Link
        to="/user/terms-of-service"
        className="underline underline-offset-4"
      >
        {t('login.service')}
      </Link>{' '}
      {t('login.and')}{' '}
      <Link to="/user/privacy-policy" className="underline underline-offset-4">
        {t('login.privacy')}
      </Link>
      {t('login.dot')}
    </div>
  );
}
