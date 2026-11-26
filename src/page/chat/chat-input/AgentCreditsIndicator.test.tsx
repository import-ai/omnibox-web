import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import useQuota, { type UsageData } from '@/hooks/useQuota';

import AgentCreditsIndicator from './AgentCreditsIndicator';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('i18next', () => ({
  __esModule: true,
  default: {
    language: 'en',
    t: (key: string) => key,
  },
}));

jest.mock('@/hooks/useQuota', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/components/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => children,
  TooltipTrigger: ({ children }: { children: ReactNode }) => children,
  TooltipContent: ({ children }: { children: ReactNode }) => (
    <span data-testid="credits-tooltip">{children}</span>
  ),
}));

const mockUseQuota = useQuota as jest.MockedFunction<typeof useQuota>;

function usage(self: number, otherUsers: number, total: number): UsageData {
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
      self,
      other_users: otherUsers,
      total,
      subscription_total: total,
      onetime_total: 0,
    },
    basic: { expired: false, expire_date: null },
    show_members_usage: false,
  };
}

describe('AgentCreditsIndicator', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows the used amount before the total amount', () => {
    mockUseQuota.mockReturnValue({
      data: usage(1_200_000, 800_000, 6_800_000_000),
      loading: false,
      refresh: jest.fn(),
    });

    const html = renderToStaticMarkup(
      <AgentCreditsIndicator namespaceId="namespace-a" />
    );

    expect(mockUseQuota).toHaveBeenCalledWith('namespace-a');
    expect(html).toContain('<button');
    expect(html).toContain('aria-label="2.00 / 6,800.00 quota.credit_unit"');
    expect(html).toContain('2.00 / 6,800.00 quota.credit_unit');
  });

  it.each([
    { data: null, loading: true },
    { data: null, loading: false },
  ])('renders nothing when credits are unavailable', quota => {
    mockUseQuota.mockReturnValue({ ...quota, refresh: jest.fn() });

    expect(
      renderToStaticMarkup(<AgentCreditsIndicator namespaceId="namespace-a" />)
    ).toBe('');
  });
});
