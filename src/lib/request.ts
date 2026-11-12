import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import axios from 'axios';
import i18next from 'i18next';
import { isUndefined } from 'lodash-es';
import { toast } from 'sonner';

import { API_BASE_URL } from '@/const';
import {
  behaviorRequestHeaders,
  rememberBehaviorUpload,
} from '@/lib/behaviorRequest';
import { detectBrowserLanguage } from '@/lib/detectLanguage';
import { removeGlobalCredential } from '@/page/user/util';

export interface RequestConfig extends AxiosRequestConfig {
  traceScopeValid?: () => boolean;
  // Whether to show error messages, default is true
  mute?: boolean;
  // Leave the response handling to the caller. Used by background session
  // checks that must not redirect a public page to the login screen.
  skipAuthRedirect?: boolean;
  // Suppress the global error toast only for these response error codes,
  // letting all other errors fall through to the global handler.
  muteCodes?: string[];
  // Suppress the global error toast when this returns true, for errors the
  // caller reports itself and that carry no distinguishing code.
  muteWhen?: (error: AxiosError) => boolean;
}

const request: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Platform': 'web',
  },
});

window.addEventListener('unhandledrejection', event => {
  if (axios.isCancel(event.reason)) {
    event.preventDefault();
  }
});

request.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const lang = localStorage.getItem('i18nextLng') || detectBrowserLanguage();
    if (lang) {
      config.headers['X-Lang'] = lang;
    }
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timeZone) {
      config.headers['X-Timezone'] = timeZone;
    }
    config.headers['From'] = 'web';
    if (!config.headers['x-omnibox-action-id']) {
      const payload =
        typeof config.data === 'string'
          ? (() => {
              try {
                return JSON.parse(config.data);
              } catch {
                return undefined;
              }
            })()
          : config.data;
      Object.assign(
        config.headers,
        behaviorRequestHeaders(
          config.method || 'GET',
          config.url || '',
          payload
        )
      );
    }

    if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }
    if ((config as RequestConfig).traceScopeValid?.() === false) {
      throw new axios.CanceledError('Trace scope changed');
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

function handleTokenError(redirect: boolean) {
  const returnTo = window.location.href;
  const preserveRedirect =
    redirect || window.location.pathname === '/oauth/authorize';
  const target = preserveRedirect
    ? `/user/login?redirect=${encodeURIComponent(returnTo)}`
    : '/user/login';
  removeGlobalCredential();
  setTimeout(() => {
    window.location.href = target;
  }, 1000);
}

request.interceptors.response.use(
  (response: AxiosResponse) => {
    rememberBehaviorUpload(
      response.config.url || '',
      response.config.headers as Record<string, string>,
      response.data
    );
    return response.data;
  },
  (error: AxiosError) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }
    const err = error as AxiosError;
    const config = (err.config as RequestConfig) || {};
    const skipAuthRedirect = config.skipAuthRedirect === true;
    // @ts-ignore
    const errorCode: string = (err.response?.data?.code || '').toLowerCase();
    const mutedByCode = (config.muteCodes || []).some(
      code => code.toLowerCase() === errorCode
    );
    const mutedByPredicate = config.muteWhen?.(err) ?? false;
    if (
      (isUndefined(config.mute) || !config.mute) &&
      !mutedByCode &&
      !mutedByPredicate
    ) {
      let errorMessage = i18next.t('request.failed');
      if (errorCode === 'user_not_owner_or_admin') {
        errorMessage = i18next.t('permission.invite_owner_or_admin_required');
      } else if (
        err.response &&
        err.response.data &&
        // @ts-ignore
        err.response.data.message
      ) {
        // @ts-ignore
        errorMessage = err.response.data.message;
      } else {
        switch (err.status) {
          case 400:
            errorMessage = i18next.t('request.bad_request');
            break;
          case 401:
            errorMessage = i18next.t('request.unauthorized');
            break;
          case 403:
            errorMessage = i18next.t('request.forbidden');
            break;
          case 404:
            errorMessage = i18next.t('request.not_found');
            break;
          case 500:
            errorMessage = i18next.t('request.internal_server_error');
            break;
          default:
            errorMessage = i18next.t('request.unknown_error');
        }
      }
      if (
        err.status === 401 &&
        !skipAuthRedirect &&
        window.location.pathname !== '/user/login'
      ) {
        handleTokenError(false);
      }
      toast.error(errorMessage, { position: 'bottom-right' });
    }
    if (!skipAuthRedirect) {
      if (errorCode === 'token_expired') {
        handleTokenError(true);
      } else if (errorCode === 'invalid_token') {
        handleTokenError(false);
      }
    }
    return Promise.reject(error);
  }
);

// Encapsulated request methods
export const http = {
  get: <T = any>(url: string, config?: RequestConfig): Promise<any> => {
    return request.get<T>(url, config);
  },
  post: <T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<any> => {
    return request.post<T>(url, data, config);
  },
  put: <T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<any> => {
    return request.put<T>(url, data, config);
  },
  patch: <T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<any> => {
    return request.patch<T>(url, data, config);
  },
  delete: <T = any>(url: string, config?: RequestConfig): Promise<any> => {
    return request.delete<T>(url, config);
  },
};

export default request;
