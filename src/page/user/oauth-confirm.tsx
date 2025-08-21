import { LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import WrapperPage from './wrapper';

export default function OauthConfirmPage() {
  const { t } = useTranslation();

  return (
    <WrapperPage useCard={false}>
      <div className="flex font-bold gap-2 justify-center items-center">
        <LoaderCircle className="transition-transform animate-spin" />
        {t('login.authorizing')}
      </div>
    </WrapperPage>
  );
}
