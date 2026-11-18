/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { PaywallDialog } from './PaywallDialog';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh-CN' },
  }),
}));

jest.mock('@/assets/logo.svg', () => 'logo.svg');

jest.mock('@/components/omnibox/Dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? children : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h1>{children}</h1>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
}));

const mockHidePaywall = jest.fn();
const mockRequest: {
  current: {
    id: number;
    scene: 'credits_limit';
    tier: 'basic' | 'premium';
    namespaceId: string;
    trigger: string;
    isOwner?: boolean;
  };
} = {
  current: {
    id: 1,
    scene: 'credits_limit',
    tier: 'basic',
    namespaceId: 'namespace-a',
    trigger: 'chat_thinking_pro',
  },
};
const mockNamespace: {
  value:
    { id: string; tier: 'basic' | 'premium'; is_owner: boolean } | undefined;
} = { value: undefined };

jest.mock('./paywallContext', () => ({
  usePaywall: () => ({
    request: mockRequest.current,
    hidePaywall: mockHidePaywall,
  }),
}));

jest.mock('@/hooks/useNamespaceInfo', () => ({
  useNamespaceInfo: (namespaceId?: string) => ({
    namespace: mockNamespace.value,
    loading: false,
    resolvedId: namespaceId,
  }),
}));

jest.mock('@/lib/useNamespaceRole', () => ({
  useNamespaceRole: () => ({ role: 'member' }),
}));

jest.mock('@/lib/sendTrackEvent', () => ({
  track: jest.fn().mockResolvedValue(undefined),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('PaywallDialog', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    root = createRoot(container);
    mockNamespace.value = undefined;
    mockRequest.current = {
      id: 1,
      scene: 'credits_limit',
      tier: 'basic',
      namespaceId: 'namespace-a',
      trigger: 'chat_thinking_pro',
    };
    jest.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    jest.clearAllMocks();
  });

  it('sends owners to pricing from the primary button', async () => {
    mockNamespace.value = {
      id: 'namespace-a',
      tier: 'basic',
      is_owner: true,
    };
    await act(async () => root.render(<PaywallDialog />));

    expect(container.textContent).toContain(
      'paywall.credits_limit.basic.title'
    );
    const cta = [...container.querySelectorAll('button')].find(button =>
      button.textContent?.includes('paywall.credits_limit.basic.cta')
    );
    expect(cta).toBeTruthy();

    await act(async () => cta?.click());

    expect(mockHidePaywall).toHaveBeenCalledWith('navigate');
    expect(window.open).toHaveBeenCalledWith(
      '/zh-cn/pricing?namespace=namespace-a&entry=paywall_credits_limit',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('uses the new request role and tier instead of the previous namespace', async () => {
    mockNamespace.value = {
      id: 'namespace-a',
      tier: 'premium',
      is_owner: true,
    };
    await act(async () => root.render(<PaywallDialog />));

    mockRequest.current = {
      ...mockRequest.current,
      id: 2,
      namespaceId: 'namespace-b',
      tier: 'basic',
      isOwner: false,
    };
    await act(async () => root.render(<PaywallDialog />));

    expect(container.textContent).toContain('paywall.non_owner_title');
    expect(container.textContent).toContain(
      'paywall.credits_limit.basic.title'
    );
    expect(container.textContent).not.toContain(
      'paywall.credits_limit.premium.cta'
    );
  });

  it('only acknowledges the prompt for non-owners', async () => {
    mockNamespace.value = {
      id: 'namespace-a',
      tier: 'basic',
      is_owner: false,
    };
    await act(async () => root.render(<PaywallDialog />));

    expect(container.textContent).toContain('paywall.non_owner_title');
    expect(container.textContent).toContain(
      'paywall.credits_limit.basic.title'
    );
    const cta = [...container.querySelectorAll('button')].find(button =>
      button.textContent?.includes('paywall.acknowledge')
    );
    expect(cta).toBeTruthy();

    await act(async () => cta?.click());

    expect(mockHidePaywall).toHaveBeenCalledWith('acknowledge');
    expect(window.open).not.toHaveBeenCalled();
  });
});
