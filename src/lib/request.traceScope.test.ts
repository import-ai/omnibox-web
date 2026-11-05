/** @jest-environment jsdom */
import axios from 'axios';

import { http } from './request';

jest.mock('lodash-es', () => ({
  isUndefined: (value: unknown) => value === undefined,
}));
jest.mock('@/const', () => ({ API_BASE_URL: '/api/v1' }));
jest.mock('@/page/user/util', () => ({ removeGlobalCredential: jest.fn() }));
jest.mock('@/lib/detectLanguage', () => ({
  detectBrowserLanguage: () => 'en',
}));

test('a changed trace scope is cancelled before the real Axios adapter can dispatch', async () => {
  const adapter = jest.fn(async config => ({
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  }));
  try {
    await http.post('/trace', {}, { traceScopeValid: () => false, adapter });
    throw new Error('should cancel');
  } catch (error) {
    expect(axios.isCancel(error)).toBe(true);
  }
  expect(adapter).not.toHaveBeenCalled();
  await http.post('/trace', {}, { traceScopeValid: () => true, adapter });
  expect(adapter).toHaveBeenCalledTimes(1);
});
