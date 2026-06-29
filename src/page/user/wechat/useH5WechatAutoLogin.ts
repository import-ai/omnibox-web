import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { WECHAT_H5_LAUNCH_FROM } from '@/const';
import { http } from '@/lib/request';
import { getAuthSuccessRedirect } from '@/page/user/authRedirect';
import { setGlobalCredential } from '@/page/user/util';

import { collectWechatEnvDebugInfo, isMiniProgramWebView } from './wechatEnv';

export type H5WechatAutoLoginPhase =
  | 'idle'
  | 'logging_in'
  | 'redirecting'
  | 'missing_mp_code'
  | 'error';

export interface H5WechatAutoLoginState {
  phase: H5WechatAutoLoginPhase;
  errorMessage: string | null;
  debugInfo: Record<string, string>;
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; code?: string };
    if (data?.message) {
      return data.code ? `${data.message} (${data.code})` : data.message;
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function useH5WechatAutoLogin(): H5WechatAutoLoginState {
  const [params] = useSearchParams();
  const attempted = useRef(false);
  const [state, setState] = useState<H5WechatAutoLoginState>({
    phase: 'idle',
    errorMessage: null,
    debugInfo: {},
  });

  useEffect(() => {
    const isWeChat = navigator.userAgent
      .toLowerCase()
      .includes('micromessenger');
    const mpCode = params.get('mp_code');
    const from = params.get('from');
    const redirect = params.get('redirect');
    const debugInfo = collectWechatEnvDebugInfo({
      from,
      hasMpCode: Boolean(mpCode),
      mpCodeLength: mpCode?.length ?? 0,
    });

    setState(prev => ({ ...prev, debugInfo }));

    if (!isWeChat) {
      return;
    }

    if (attempted.current) {
      return;
    }

    console.info('[h5-wechat-login] context', debugInfo);

    if (mpCode) {
      attempted.current = true;
      setState(prev => ({
        ...prev,
        phase: 'logging_in',
        errorMessage: null,
        debugInfo,
      }));

      http
        .post('/wechat/login/mini_program', { code: mpCode }, { mute: true })
        .then(async (res: { id: string; access_token: string }) => {
          setState(prev => ({
            ...prev,
            phase: 'redirecting',
            errorMessage: null,
          }));
          setGlobalCredential(res.id, res.access_token);
          window.location.href = await getAuthSuccessRedirect(redirect);
        })
        .catch(error => {
          attempted.current = false;
          const errorMessage = getErrorMessage(error);
          console.error('[h5-wechat-login] mini_program failed', error);
          setState(prev => ({
            ...prev,
            phase: 'error',
            errorMessage,
            debugInfo,
          }));
        });
      return;
    }

    if (from !== WECHAT_H5_LAUNCH_FROM) {
      return;
    }

    if (isMiniProgramWebView()) {
      console.warn(
        '[h5-wechat-login] missing mp_code in mini program web-view'
      );
      setState(prev => ({
        ...prev,
        phase: 'missing_mp_code',
        errorMessage: null,
        debugInfo,
      }));
      return;
    }

    attempted.current = true;
    setState(prev => ({
      ...prev,
      phase: 'logging_in',
      errorMessage: null,
      debugInfo,
    }));

    http
      .get('/wechat/auth-url', {
        params: redirect ? { redirect } : undefined,
        mute: true,
      })
      .then(authUrl => {
        window.location.href = authUrl;
      })
      .catch(error => {
        attempted.current = false;
        const errorMessage = getErrorMessage(error);
        setState(prev => ({
          ...prev,
          phase: 'error',
          errorMessage,
          debugInfo,
        }));
      });
  }, [params]);

  return state;
}
