/** @jest-environment jsdom */

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { ResourceType } from '@/interface';

import { ShareTabContent } from '.';

const mockGet = jest.fn();
const mockPatch = jest.fn();

jest.mock('react-i18next', () => ({
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('sonner', () => ({ toast: jest.fn() }));
jest.mock('@/lib/request', () => ({
  http: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));
jest.mock('@/components/help-tooltip', () => ({
  HelpTooltip: () => null,
}));
jest.mock('@/components/input', () => ({
  Input: () => null,
}));
jest.mock('@/components/ui/Button', () => ({
  Button: ({ children }: { children?: ReactNode }) => children,
}));
jest.mock('@/components/ui/Switch', () => ({
  Switch: ({ checked, disabled }: { checked: boolean; disabled?: boolean }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
    />
  ),
}));
jest.mock('./Expire', () => ({ Expire: () => null }));
jest.mock('./Password', () => ({ Password: () => null }));
jest.mock('./ShareTypeSelector', () => ({ ShareTypeSelector: () => null }));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const shareInfo = {
  id: 'share-1',
  enabled: true,
  resource_id: 'resource-1',
  all_resources: false,
  require_login: false,
  password_enabled: false,
  share_type: 'doc_only',
  expires_at: null,
};

describe('ShareTabContent', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue(shareInfo);
    mockPatch.mockResolvedValue({ ...shareInfo, all_resources: true });
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  it.each<ResourceType>(['folder', 'smart_folder', 'rss_folder'])(
    'disables sharing only the current file for %s',
    async resourceType => {
      await act(async () => {
        root.render(
          <ShareTabContent
            namespace_id="namespace-1"
            resource_id="resource-1"
            resourceType={resourceType}
          />
        );
      });

      expect(mockPatch).toHaveBeenCalledWith(
        'namespaces/namespace-1/resources/resource-1/share',
        { all_resources: true }
      );
      const switches = container.querySelectorAll('[role="switch"]');
      const currentFileSwitch = switches[1] as HTMLButtonElement;
      expect(currentFileSwitch.disabled).toBe(true);
      expect(currentFileSwitch.getAttribute('aria-checked')).toBe('false');
    }
  );

  it('keeps the current-file option available for a document', async () => {
    await act(async () => {
      root.render(
        <ShareTabContent
          namespace_id="namespace-1"
          resource_id="resource-1"
          resourceType="doc"
        />
      );
    });

    expect(mockPatch).not.toHaveBeenCalled();
    const switches = container.querySelectorAll('[role="switch"]');
    const currentFileSwitch = switches[1] as HTMLButtonElement;
    expect(currentFileSwitch.disabled).toBe(false);
    expect(currentFileSwitch.getAttribute('aria-checked')).toBe('true');
  });
});
