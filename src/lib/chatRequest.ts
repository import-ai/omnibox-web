import { http, type RequestConfig } from '@/lib/request';

const chatConfig = (config?: RequestConfig): RequestConfig => ({
  ...config,
  errorContext: 'chat',
});

export const chatHttp: typeof http = {
  get: (url, config) => http.get(url, chatConfig(config)),
  post: (url, data, config) => http.post(url, data, chatConfig(config)),
  put: (url, data, config) => http.put(url, data, chatConfig(config)),
  patch: (url, data, config) => http.patch(url, data, chatConfig(config)),
  delete: (url, config) => http.delete(url, chatConfig(config)),
};
