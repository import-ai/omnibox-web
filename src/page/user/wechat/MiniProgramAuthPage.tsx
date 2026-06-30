import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Spinner } from '@/components/ui/Spinner';
import { getAuthSuccessRedirect } from '@/page/user/authRedirect';
import { setGlobalCredential } from '@/page/user/util';

import WrapperPage from '../WrapperPage';

function getHashParams(): URLSearchParams {
  return new URLSearchParams(window.location.hash.replace(/^#/, ''));
}

export default function MiniProgramAuthPage() {
  const { t } = useTranslation();

  useEffect(() => {
    const params = getHashParams();
    const uid = params.get('uid');
    const token = params.get('token');
    const redirect = params.get('redirect');

    if (!uid || !token) {
      location.replace('/user/login');
      return;
    }

    setGlobalCredential(uid, token);
    void getAuthSuccessRedirect(redirect).then(target => {
      location.replace(target);
    });
  }, []);

  return (
    <WrapperPage useCard={false}>
      <div className="flex font-bold gap-2 justify-center items-center">
        <Spinner />
        {t('login.authorizing')}
      </div>
    </WrapperPage>
  );
}
