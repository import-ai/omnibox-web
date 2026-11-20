/** @jest-environment jsdom */

import type { ReactNode } from 'react';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import useQuota, { type UsageData } from '@/hooks/useQuota';

import AgentCreditsIndicator, {
  AGENT_CREDITS_REFRESH_INTERVAL_MS,
} from './AgentCreditsIndicator';

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

jest.mock('@/page/settings/tabs/quota', () => ({
  QuotaDisplay: () => null,
}));

jest.mock('@/components/tooltip', () => ({
  Tooltip: ({
    children,
    onOpenChange,
  }: {
    children: ReactNode;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <>
      <button
        data-testid="open-credits-tooltip"
        onClick={() => onOpenChange?.(true)}
      />
      {children}
    </>
  ),
  TooltipTrigger: ({ children }: { children: ReactNode }) => children,
  TooltipContent: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const mockUseQuota = useQuota as jest.MockedFunction<typeof useQuota>;

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

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

describe('AgentCreditsIndicator refresh', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    jest.useRealTimers();
    await act(async () => root.unmount());
    jest.clearAllMocks();
  });

  it('refreshes while generating and once when generation ends', async () => {
    jest.useFakeTimers();
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockUseQuota.mockReturnValue({
      data: usage(),
      loading: false,
      refresh,
    });

    await act(async () =>
      root.render(
        <AgentCreditsIndicator namespaceId="namespace-a" isGenerating />
      )
    );
    expect(refresh).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(AGENT_CREDITS_REFRESH_INTERVAL_MS);
      await Promise.resolve();
    });
    expect(refresh).toHaveBeenCalledTimes(1);

    await act(async () =>
      root.render(
        <AgentCreditsIndicator namespaceId="namespace-a" isGenerating={false} />
      )
    );
    expect(refresh).toHaveBeenCalledTimes(2);

    await act(async () => {
      jest.advanceTimersByTime(AGENT_CREDITS_REFRESH_INTERVAL_MS * 2);
      await Promise.resolve();
    });
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('refreshes immediately when the tooltip opens', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockUseQuota.mockReturnValue({
      data: usage(),
      loading: false,
      refresh,
    });

    await act(async () =>
      root.render(<AgentCreditsIndicator namespaceId="namespace-a" />)
    );
    await act(async () => {
      (
        container.querySelector(
          '[data-testid="open-credits-tooltip"]'
        ) as HTMLButtonElement
      ).click();
    });

    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
