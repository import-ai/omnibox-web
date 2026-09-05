/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import useQuota, { UsageData } from '@/hooks/useQuota';

import { RemainQuota } from './index';
import type { StorageSectionProps } from './StorageSection';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('i18next', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

jest.mock('@/hooks/useQuota', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const renderedSections: StorageSectionProps[] = [];

jest.mock('./ExpandButton', () => ({ ExpandButton: () => null }));
jest.mock('./Expiration', () => ({ Expiration: () => null }));
jest.mock('./StorageSection', () => ({
  StorageSection: (props: StorageSectionProps) => {
    renderedSections.push(props);
    return null;
  },
}));

const usage = (overrides: Partial<UsageData> = {}): UsageData => ({
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
    self: 0,
    other_users: 0,
    total: 0,
    subscription_total: 0,
    onetime_total: 0,
  },
  basic: { expired: false, expire_date: null },
  show_members_usage: false,
  ...overrides,
});

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('RemainQuota', () => {
  let container: HTMLDivElement;
  let root: Root;
  const mockUseQuota = useQuota as jest.MockedFunction<typeof useQuota>;

  beforeEach(() => {
    jest.clearAllMocks();
    renderedSections.length = 0;
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  it('shows loading without rendering a placeholder plan', async () => {
    mockUseQuota.mockReturnValue({ data: null, loading: true });

    await act(async () =>
      root.render(<RemainQuota namespaceId="namespace-a" />)
    );

    expect(container.querySelector('[role="status"]')).not.toBeNull();
    expect(container.textContent).not.toContain('quota.basic_plan');
    expect(container.textContent).not.toContain('quota.forever');
  });

  it('renders no quota details when loading fails', async () => {
    mockUseQuota.mockReturnValue({ data: null, loading: false });

    await act(async () =>
      root.render(<RemainQuota namespaceId="namespace-a" />)
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders the agent credits section after the doc parse one', async () => {
    mockUseQuota.mockReturnValue({
      data: usage({
        agent_credits: {
          self: 1200,
          other_users: 0,
          total: 6800000,
          subscription_total: 6000000,
          onetime_total: 800000,
        },
      }),
      loading: false,
    });

    await act(async () =>
      root.render(<RemainQuota namespaceId="namespace-a" />)
    );

    expect(renderedSections.map(s => s.title)).toEqual([
      'quota.storage_usage',
      'quota.audio_video_parse_usage',
      'quota.doc_parse_usage',
      'quota.agent_credits_usage',
    ]);

    const credits = renderedSections[3];
    expect(credits.current).toBe(
      '1,200 quota.credit_unit / 6,800,000 quota.credit_unit'
    );
    expect(credits.currentTooltip).not.toBeUndefined();
    expect(credits.segments).toEqual([
      {
        label: 'quota.my_usage',
        color: 'bg-blue-500',
        percentage: (1200 / 6800000) * 100,
        tooltip: 'quota.tooltip_format',
      },
    ]);
  });

  it('adds the other members segment only when member usage is shown', async () => {
    mockUseQuota.mockReturnValue({
      data: usage({
        agent_credits: {
          self: 1200,
          other_users: 800,
          total: 6800000,
          subscription_total: 6800000,
          onetime_total: 0,
        },
        show_members_usage: true,
      }),
      loading: false,
    });

    await act(async () =>
      root.render(<RemainQuota namespaceId="namespace-a" />)
    );

    const credits = renderedSections[3];
    expect(credits.current).toBe(
      '2,000 quota.credit_unit / 6,800,000 quota.credit_unit'
    );
    expect(credits.segments.map(s => s.color)).toEqual([
      'bg-blue-500',
      'bg-gray-300',
    ]);
    expect(credits.items.map(i => i.label)).toEqual([
      'quota.my_usage',
      'quota.other_users',
    ]);
  });
});
