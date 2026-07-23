/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import useQuota from '@/hooks/useQuota';

import { RemainQuota } from './index';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/hooks/useQuota', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('./ExpandButton', () => ({ ExpandButton: () => null }));
jest.mock('./Expiration', () => ({ Expiration: () => null }));
jest.mock('./StorageSection', () => ({ StorageSection: () => null }));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('RemainQuota', () => {
  let container: HTMLDivElement;
  let root: Root;
  const mockUseQuota = useQuota as jest.MockedFunction<typeof useQuota>;

  beforeEach(() => {
    jest.clearAllMocks();
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
});
