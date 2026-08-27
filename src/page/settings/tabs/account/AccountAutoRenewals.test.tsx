/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import useConfig from '@/hooks/useConfig';
import { http } from '@/lib/request';
import { useSettingsToast } from '@/page/settings/SettingsToastProvider';

import { AccountAutoRenewals } from './AccountAutoRenewals';
import type { AutoRenewal } from './autoRenewal';

jest.mock('@/hooks/useConfig');
jest.mock('@/lib/request', () => ({
  http: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));
jest.mock('@/page/settings/SettingsToastProvider');
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('./AutoRenewalSection', () => ({
  AutoRenewalCard: ({
    cancel,
    polling,
    renewal,
  }: {
    cancel: (renewal: AutoRenewal) => Promise<boolean>;
    polling: boolean;
    renewal: AutoRenewal;
  }) => (
    <button
      data-polling={polling}
      onClick={() => void cancel(renewal)}
      type="button"
    >
      {renewal.status}
    </button>
  ),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function renewal(status: AutoRenewal['status']): AutoRenewal {
  return {
    id: 'renewal-id',
    namespace_id: 'namespace-id',
    price_id: 'price-id',
    tier: 'basic',
    status,
    contract_active: status !== 'canceled',
    can_cancel: status !== 'canceled',
    channel: 'wechat',
    amount: 500,
    currency: 'CNY',
    current_period_end: '2026-09-26T00:00:00.000Z',
    next_billing_at: null,
    pre_notified_at: null,
    retry_count: 0,
    canceled_at: status === 'canceled' ? '2026-08-26T00:00:00.000Z' : null,
  };
}

describe('AccountAutoRenewals', () => {
  let container: HTMLDivElement;
  let root: Root;
  const showToast = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    (useConfig as jest.Mock).mockReturnValue({ config: { commercial: true } });
    (useSettingsToast as jest.Mock).mockReturnValue({ showToast });
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    jest.useRealTimers();
  });

  it('polls a canceling renewal until it reaches a terminal status', async () => {
    const get = http.get as jest.Mock;
    get
      .mockResolvedValueOnce([renewal('active')])
      .mockResolvedValueOnce([renewal('canceled')]);
    (http.post as jest.Mock).mockResolvedValueOnce(renewal('canceling'));

    await act(async () => {
      root.render(<AccountAutoRenewals />);
      await Promise.resolve();
    });

    await act(async () => {
      container.querySelector('button')?.click();
      await Promise.resolve();
    });
    expect(container.textContent).toContain('canceling');
    expect(container.querySelector('button')?.dataset.polling).toBe('true');

    await act(async () => {
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });
    expect(get).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain('canceled');

    await act(async () => jest.advanceTimersByTime(2000));
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('stops polling and reports when cancellation remains pending', async () => {
    const get = http.get as jest.Mock;
    get.mockResolvedValue([renewal('canceling')]);

    await act(async () => {
      root.render(<AccountAutoRenewals />);
      await Promise.resolve();
    });

    for (let attempt = 0; attempt < 30; attempt += 1) {
      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });
    }

    expect(get).toHaveBeenCalledTimes(31);
    expect(container.querySelector('button')?.dataset.polling).toBe('false');
    expect(showToast).toHaveBeenCalledWith(
      'namespace.auto_renewal.cancel_timeout',
      'error'
    );
  });

  it('stops polling and reports when the status request fails', async () => {
    const get = http.get as jest.Mock;
    get
      .mockResolvedValueOnce([renewal('canceling')])
      .mockRejectedValueOnce(new Error('network error'));

    await act(async () => {
      root.render(<AccountAutoRenewals />);
      await Promise.resolve();
    });

    await act(async () => {
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    expect(get).toHaveBeenCalledTimes(2);
    expect(container.querySelector('button')?.dataset.polling).toBe('false');
    expect(showToast).toHaveBeenCalledWith(
      'namespace.auto_renewal.cancel_failed',
      'error'
    );
  });
});
