import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { Spinner } from '@/components/ui/Spinner';
import { SHOW_WECHAT_MP_LOGIN_DEBUG, WECHAT_H5_LAUNCH_FROM } from '@/const';

import type { H5WechatAutoLoginState } from './useH5WechatAutoLogin';

interface H5WechatAutoLoginStatusProps {
  state: H5WechatAutoLoginState;
}

export function H5WechatAutoLoginStatus(props: H5WechatAutoLoginStatusProps) {
  const { state } = props;
  const { t } = useTranslation();
  const [params] = useSearchParams();

  if (!SHOW_WECHAT_MP_LOGIN_DEBUG) {
    return null;
  }

  const { phase, errorMessage, debugInfo } = state;
  const from = params.get('from');
  const mpCode = params.get('mp_code');
  const redirect = params.get('redirect');

  let statusText = '';
  if (phase === 'logging_in') {
    statusText = t('login.wechat_h5_auto_logging_in');
  } else if (phase === 'redirecting') {
    statusText = t('login.wechat_h5_auto_redirecting');
  } else if (phase === 'missing_mp_code') {
    statusText = t('login.wechat_h5_missing_mp_code');
  } else if (phase === 'error' && errorMessage) {
    statusText = errorMessage;
  } else if (from === WECHAT_H5_LAUNCH_FROM) {
    statusText = t('login.wechat_h5_waiting');
  }

  return (
    <div className="mb-4 rounded-sm border-2 border-amber-500 bg-amber-50 px-3 py-3 text-xs text-amber-950 dark:bg-amber-950/40 dark:text-amber-50">
      <p className="mb-2 text-sm font-bold">微信登录调试（临时）</p>

      {(phase === 'logging_in' || phase === 'redirecting') && (
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Spinner className="size-4" />
          {statusText}
        </div>
      )}

      {phase !== 'logging_in' && phase !== 'redirecting' && statusText && (
        <p className="mb-2 text-sm font-medium">{statusText}</p>
      )}

      <dl className="space-y-1 break-all">
        <div>
          <dt className="inline font-semibold">phase: </dt>
          <dd className="inline">{phase}</dd>
        </div>
        <div>
          <dt className="inline font-semibold">from: </dt>
          <dd className="inline">{from || '(none)'}</dd>
        </div>
        <div>
          <dt className="inline font-semibold">mp_code: </dt>
          <dd className="inline">
            {mpCode ? `yes (len=${mpCode.length})` : 'no'}
          </dd>
        </div>
        <div>
          <dt className="inline font-semibold">redirect: </dt>
          <dd className="inline">{redirect || '(none)'}</dd>
        </div>
        {errorMessage && (
          <div>
            <dt className="inline font-semibold">error: </dt>
            <dd className="inline">{errorMessage}</dd>
          </div>
        )}
        {Object.entries(debugInfo).map(([key, value]) => (
          <div key={key}>
            <dt className="inline font-semibold">{key}: </dt>
            <dd className="inline">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
