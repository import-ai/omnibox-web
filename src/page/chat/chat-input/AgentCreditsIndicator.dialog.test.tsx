/** @jest-environment jsdom */

import type { ReactNode } from 'react';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import useApp from '@/hooks/useApp';
import useQuota, { type UsageData } from '@/hooks/useQuota';
import Setting from '@/page/settings';

import AgentCreditsIndicator from './AgentCreditsIndicator';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('i18next', () => ({
  __esModule: true,
  default: { language: 'en', t: (key: string) => key },
}));

jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: jest.fn(),
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

jest.mock('@/lib/behaviorTracking', () => ({
  useBehaviorSurface: jest.fn(),
}));

jest.mock('@/lib/captcha', () => ({ isInsideAliyunCaptcha: () => false }));
jest.mock('@/lib/trackButtonClick', () => ({ trackButtonClick: jest.fn() }));
jest.mock('@/page/settings/SettingWrapper', () => ({
  __esModule: true,
  default: ({
    initialTab,
    onClose,
  }: {
    initialTab?: string;
    onClose: () => void;
  }) => (
    <div data-testid="settings-wrapper" data-initial-tab={initialTab}>
      <button type="button" onClick={onClose}>
        Close settings
      </button>
    </div>
  ),
}));

const mockUseApp = useApp as jest.MockedFunction<typeof useApp>;
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
  let app: {
    on: jest.Mock;
    fire: jest.Mock;
  };

  beforeEach(() => {
    const listeners = new Map<string, (payload: { tab?: string }) => void>();
    app = {
      on: jest.fn((event, listener) => {
        listeners.set(event, listener);
        return () => listeners.delete(event);
      }),
      fire: jest.fn((event, payload) => listeners.get(event)?.(payload)),
    };
    mockUseApp.mockReturnValue(app as unknown as ReturnType<typeof useApp>);
    mockUseQuota.mockReturnValue({
      data: usage(),
      loading: false,
      refresh: jest.fn(),
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it.each([
    { activation: 'keyboard', initiallyFocused: true },
    { activation: 'pointer without auto-focus', initiallyFocused: false },
  ])(
    'restores focus after $activation activation',
    async ({ initiallyFocused }) => {
      await act(async () =>
        root.render(
          <>
            <Setting />
            <AgentCreditsIndicator namespaceId="namespace-a" />
          </>
        )
      );

      const trigger = container.querySelector<HTMLButtonElement>(
        'button[aria-label="1.20 / 6,800.00 quota.credit_unit"]'
      )!;
      if (initiallyFocused) trigger.focus();
      expect(document.activeElement).toBe(
        initiallyFocused ? trigger : document.body
      );
      await act(async () => trigger.click());

      expect(app.fire).toHaveBeenCalledWith('open_settings', {
        tab: 'usage',
        focusReturnTarget: trigger,
      });
      expect(document.querySelector('[role="dialog"]')).not.toBeNull();
      expect(
        document
          .querySelector('[data-testid="settings-wrapper"]')
          ?.getAttribute('data-initial-tab')
      ).toBe('usage');

      const close = document.querySelector<HTMLButtonElement>(
        '[data-testid="settings-wrapper"] button'
      )!;
      await act(async () => close.click());
      await act(async () => new Promise(resolve => setTimeout(resolve, 0)));

      expect(document.querySelector('[role="dialog"]')).toBeNull();
      expect(document.activeElement).toBe(trigger);
    }
  );
});
