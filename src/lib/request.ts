import axios from 'axios';
import i18next from 'i18next';
import { toast } from 'sonner';
import { isUndefined } from 'lodash-es';
import { API_BASE_URL } from '@/constants';
import type {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  AxiosRequestConfig,
} from 'axios';

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
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

request.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data;
  },
  (error: AxiosError) => {
    const config = (error.config as RequestConfig) || {};
    if (isUndefined(config.mute) || !config.mute) {
      let errorMessage = i18next.t('request.failed');
      if (
        error.response &&
        error.response.data &&
        // @ts-ignore
        error.response.data.message
      ) {
        // @ts-ignore
        errorMessage = error.response.data.message;
      } else {
        switch (error.status) {
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
      if (error.status === 401 && localStorage.getItem('uid')) {
        localStorage.removeItem('uid');
        localStorage.removeItem('token');
        setTimeout(() => {
          window.location.href = '/user/login';
        }, 1000);
      }
    }
    return Promise.reject(error);
  },
);

// Encapsulated request methods
export const http = {
  get: <T = any>(url: string, config?: RequestConfig): Promise<any> => {
    return request.get<T>(url, config);
  },
  post: <T = any>(
    url: string,
    data?: any,
    config?: RequestConfig,
  ): Promise<any> => {
    return request.post<T>(url, data, config);
  },
  put: <T = any>(
    url: string,
    data?: any,
    config?: RequestConfig,
  ): Promise<any> => {
    return request.put<T>(url, data, config);
  },
  patch: <T = any>(
    url: string,
    data?: any,
    config?: RequestConfig,
  ): Promise<any> => {
    return request.patch<T>(url, data, config);
  },
  delete: <T = any>(url: string, config?: RequestConfig): Promise<any> => {
    return request.delete<T>(url, config);
  },
};

export default request;
