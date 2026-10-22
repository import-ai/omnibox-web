/** @jest-environment jsdom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { http } from '@/lib/request';

import { TaskList } from './TaskList';

jest.mock('@/lib/request', () => ({ http: { get: jest.fn() } }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en-US' },
  }),
}));
jest.mock('./TaskActions', () => ({ TaskActions: () => null }));
jest.mock('./TaskTypeBadge', () => ({ TaskTypeBadge: () => null }));
jest.mock('./TaskStatusBadge', () => ({ TaskStatusBadge: () => null }));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test('refresh and pagination keep controls mounted while only the list loads', async () => {
  localStorage.removeItem('uid');
  const host = document.createElement('div');
  const root = createRoot(host);
  const response = { tasks: [{ id: 'task-1', status: 'pending' }], total: 40 };
  jest.mocked(http.get).mockResolvedValue(response);
  await act(async () => root.render(<TaskList namespaceId="test" />));
  const refresh = Array.from(host.querySelectorAll('button')).find(
    button => button.textContent === 'common.refresh'
  )!;
  const pagination = host.querySelector('[data-slot="pagination"]');
  for (const action of [
    refresh,
    host.querySelector<HTMLAnchorElement>('[aria-label="common.next"]')!,
  ]) {
    let resolve!: (value: typeof response) => void;
    jest.mocked(http.get).mockImplementationOnce(
      () =>
        new Promise(done => {
          resolve = done;
        })
    );
    await act(async () => action.click());
    expect(host.contains(refresh)).toBe(true);
    expect(host.querySelector('[data-slot="pagination"]')).toBe(pagination);
    expect(host.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(refresh.disabled).toBe(true);
    await act(async () => resolve(response));
    expect(host.querySelector('[aria-busy="true"]')).toBeNull();
  }
  expect(host.querySelector('[aria-current="page"]')?.textContent).toBe('2');
  act(() => root.unmount());
});
