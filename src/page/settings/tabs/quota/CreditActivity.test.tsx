/** @jest-environment jsdom */
import i18next from 'i18next';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import en from '@/i18n/locales/en.json';
import zh from '@/i18n/locales/zh.json';
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
  expect(get.mock.calls[1][1].params).toEqual({
    offset: 20,
    limit: 20,
    scope: 'own',
  });
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

it('does not refetch on focus and keeps the empty state unfilled', async () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const get = http.get as jest.Mock;
  get
    .mockReset()
    .mockResolvedValue({ items: [], total: 0, can_view_all: false });
  await act(async () => root.render(<CreditActivity namespaceId="test" />));
  expect(get.mock.calls[0][1].params.scope).toBe('own');
  await act(async () => {
    window.dispatchEvent(new Event('focus'));
  });
  expect(get).toHaveBeenCalledTimes(1);
  expect(container.querySelector('tbody tr')?.className).toContain(
    'hover:bg-transparent'
  );
  const refresh = [...container.querySelectorAll('button')].find(
    button => button.textContent === 'common.refresh'
  );
  await act(async () => refresh!.click());
  expect(get).toHaveBeenCalledTimes(2);
  await act(async () => root.unmount());
});

it.each([
  ['en', 'Subscription Kibble Expired', 'Subscription Kibble'],
  ['zh', '订阅猫粮过期', '订阅猫粮'],
] as const)(
  'renders the expiry and grant in API order in %s',
  async (language, expiry, grant) => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const locales = { en, zh };
    const i18n = i18next.createInstance();
    await i18n.init({
      lng: language,
      resources: { [language]: { translation: locales[language] } },
    });
    const translation = jest
      .spyOn(jest.requireMock('react-i18next'), 'useTranslation')
      .mockReturnValue({ t: i18n.t.bind(i18n) });
    const occurred_at = '2026-11-11T00:00:00Z';
    (http.get as jest.Mock).mockReset().mockResolvedValue({
      items: [
        {
          id: 'expiry',
          event_type: 'subscription_expired',
          occurred_at,
          amount: -2_300_000_000,
        },
        {
          id: 'grant',
          event_type: 'subscription',
          occurred_at,
          amount: 100_000_000,
        },
      ],
      total: 2,
    });
    try {
      await act(async () => root.render(<CreditActivity namespaceId="test" />));
      expect(
        [...container.querySelectorAll('tbody tr')].map(row => [
          row.querySelector('p')?.textContent,
          row.querySelector('td:last-child')?.textContent,
        ])
      ).toEqual([
        [expiry, '−2,300.00'],
        [grant, '+100.00'],
      ]);
    } finally {
      await act(async () => root.unmount());
      translation.mockRestore();
    }
  }
);
