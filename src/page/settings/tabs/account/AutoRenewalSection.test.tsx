/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import type { AutoRenewal } from './autoRenewal';
import { AutoRenewalCard } from './AutoRenewalSection';

jest.mock('@/components/button', () => ({
  Button: ({ children, ...props }: React.ComponentProps<'button'>) => (
    <button {...props}>{children}</button>
  ),
}));
jest.mock('./useAutoRenewal', () => ({ useAutoRenewal: jest.fn() }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { resolvedLanguage: 'zh-CN' },
    t: (key: string) => key,
  }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const renewal: AutoRenewal = {
  id: 'renewal-id',
  namespace_id: 'namespace-id',
  price_id: 'price-id',
  tier: 'premium',
  status: 'canceling',
  contract_active: true,
  can_cancel: true,
  channel: 'wechat',
  amount: 3100,
  currency: 'CNY',
  current_period_end: '2026-09-26T00:00:00.000Z',
  next_billing_at: null,
  pre_notified_at: null,
  retry_count: 0,
  canceled_at: null,
};

describe('AutoRenewalCard', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  it('shows a pending cancellation without allowing another request', async () => {
    await act(async () => {
      root.render(
        <AutoRenewalCard
          cancel={jest.fn()}
          canceling={false}
          polling={false}
          renewal={renewal}
        />
      );
    });

    expect(container.textContent).toContain(
      'namespace.auto_renewal.cancel_pending'
    );
    expect(container.textContent).toContain(
      'namespace.auto_renewal.cancel_pending_description'
    );
    expect(container.querySelector('button')).toBeNull();
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('shows and allows canceling a signed contract before payment', async () => {
    await act(async () => {
      root.render(
        <AutoRenewalCard
          cancel={jest.fn()}
          canceling={false}
          polling={false}
          renewal={{ ...renewal, status: 'signing' }}
        />
      );
    });

    expect(container.textContent).toContain('namespace.auto_renewal.signing');
    expect(container.textContent).toContain(
      'namespace.auto_renewal.signing_description'
    );
    expect(container.querySelector('button')).not.toBeNull();
  });
});
