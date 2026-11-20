/** @jest-environment jsdom */

import type { ReactNode } from 'react';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import useQuota, { type UsageData } from '@/hooks/useQuota';

import AgentCreditsIndicator from './AgentCreditsIndicator';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/hooks/useQuota', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/components/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => children,
  TooltipTrigger: ({ children }: { children: ReactNode }) => children,
  TooltipContent: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

jest.mock('@/page/settings/tabs/quota', () => ({
  QuotaDisplay: () => <div>Usage details</div>,
}));

const mockUseQuota = useQuota as jest.MockedFunction<typeof useQuota>;

function usage(): UsageData {
  return {
    storage_bytes: {
      upload: 0,
      file: 0,
      other_users: 0,
      total: 0,
      subscription_total: 0,
      onetime_total: 0,
    },
    video_audio_parse: {
      video: 0,
      audio: 0,
      other_users: 0,
      total: 0,
      subscription_total: 0,
      onetime_total: 0,
    },
    doc_parse: {
      pdf: 0,
      image: 0,
      other_users: 0,
      total: 0,
      subscription_total: 0,
      onetime_total: 0,
    },
    agent_credits: {
      self: 1_200_000,
      other_users: 0,
      total: 6_800_000_000,
      subscription_total: 6_800_000_000,
      onetime_total: 0,
    },
    basic: { expired: false, expire_date: null },
    show_members_usage: false,
  };
}

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('AgentCreditsIndicator usage dialog', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockUseQuota.mockReturnValue({
      data: usage(),
      loading: false,
      refresh: jest.fn(),
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('opens the usage dialog from the credits ring', async () => {
    await act(async () =>
      root.render(<AgentCreditsIndicator namespaceId="namespace-a" />)
    );

    const trigger = container.querySelector<HTMLButtonElement>('button');
    expect(trigger).not.toBeNull();
    expect(trigger?.getAttribute('aria-label')).toBe(
      '1.20 / 6,800.00 quota.credit_unit'
    );

    await act(async () => trigger?.click());

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.body.textContent).toContain('namespace.usage');
    expect(document.body.textContent).toContain('Usage details');
  });
});
