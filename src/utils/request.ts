import axios from 'axios';
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
  // 是否显示错误提示，默认为 true
  mute?: boolean;
}

const request: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
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
  }
);

request.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data;
  },
  (error: AxiosError) => {
    const config = (error.config as RequestConfig) || {};
    if (isUndefined(config.mute) || !config.mute) {
      let errorMessage = '请求失败，请稍后重试';
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
            errorMessage = '请求参数错误';
            break;
          case 401:
            errorMessage = '未授权，请重新登录';
            break;
          case 403:
            errorMessage = '拒绝访问';
            break;
          case 404:
            errorMessage = '请求地址不存在';
            break;
          case 500:
            errorMessage = '服务器内部错误';
            break;
          default:
            errorMessage = `请求失败：${error.status}`;
        }
      }
      if (error.status === 401) {
        localStorage.removeItem('uid');
        localStorage.removeItem('token');
        localStorage.removeItem('namespace');
        setTimeout(() => {
          location.reload();
        }, 1000);
      }
      toast.error(errorMessage, { position: 'top-center' });
    }
    return Promise.reject(error);
  }
);

// 封装请求方法
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
