/** @jest-environment jsdom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { http } from '@/lib/request';

import { CreditActivity } from './CreditActivity';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/lib/request', () => ({ http: { get: jest.fn() } }));
jest.mock('@/hooks/useMobile', () => ({ useIsMobile: () => false }));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

it('keeps outer scroll and pagination while fetching the next page, resetting only the ledger', async () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const get = http.get as jest.Mock;
  const response = {
    items: [
      {
        id: '1',
        event_type: 'topup',
        occurred_at: '2026-11-11T00:00:00Z',
        amount: 1000000,
      },
    ],
    total: 21,
  };
  get.mockResolvedValueOnce(response);
  await act(async () => root.render(<CreditActivity namespaceId="test" />));
  expect(container.querySelectorAll('thead th')).toHaveLength(2);
  expect(container.querySelector('tbody td p')?.textContent).toBe(
    'quota.activity_types.topup'
  );
  expect(container.querySelector('tbody td time')).not.toBeNull();
  const viewport = container.querySelector(
    '[data-slot="table-container"]'
  )!.parentElement!;
  container.scrollTop = 230;
  viewport.scrollTop = 120;
  let resolve!: (value: typeof response) => void;
  get.mockImplementationOnce(
    () =>
      new Promise(r => {
        resolve = r;
      })
  );
  await act(async () =>
    (
      container.querySelector('[aria-label="Go to next page"]') as HTMLElement
    ).click()
  );
  expect(get.mock.calls[1][1].params).toEqual({ offset: 20, limit: 20 });
  expect(viewport.scrollTop).toBe(0);
  expect(container.scrollTop).toBe(230);
  expect(container.querySelector('nav')).not.toBeNull();
  expect(container.querySelector('section')?.getAttribute('aria-busy')).toBe(
    'true'
  );
  await act(async () => resolve(response));
  expect(container.querySelector('section')?.getAttribute('aria-busy')).toBe(
    'false'
  );
  await act(async () => root.unmount());
});
