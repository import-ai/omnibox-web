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
import { detectBrowserLanguage } from '@/lib/detect-language';
import { removeGlobalCredential } from '@/page/user/util';

interface RequestConfig extends AxiosRequestConfig {
  // Whether to show error messages, default is true
  mute?: boolean;
}

const request: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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
    config.headers['From'] = 'web';
    if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

request.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data;
  },
  (error: AxiosError) => {
    if (axios.isCancel(error)) {
      // If the request is cancelled, do not show error message
      return Promise.resolve();
    }
    const err = error as AxiosError;
    const config = (err.config as RequestConfig) || {};
    if (isUndefined(config.mute) || !config.mute) {
      let errorMessage = i18next.t('request.failed');
      if (
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
      toast.error(errorMessage, { position: 'bottom-right' });
    }
    // @ts-ignore
    const errorCode: string = (err.response?.data?.code || '').toLowerCase();
    if (errorCode === 'token_expired') {
      removeGlobalCredential();
      setTimeout(() => {
        window.location.href = `/user/login?redirect=${encodeURIComponent(window.location.href)}`;
      }, 1000);
    } else if (errorCode === 'invalid_token') {
      removeGlobalCredential();
      setTimeout(() => {
        window.location.href = '/user/login';
      }, 1000);
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
