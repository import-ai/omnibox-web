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
  Input: ({ value, disabled }: { value?: string; disabled?: boolean }) => (
    <input data-testid="share-url" value={value} disabled={disabled} readOnly />
  ),
}));
jest.mock('@/components/ui/Button', () => ({
  Button: ({
    children,
    disabled,
    onClick,
  }: {
    children?: ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button type="button" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));
jest.mock('@/components/ui/Switch', () => ({
  Switch: ({
    checked,
    disabled,
    onCheckedChange,
  }: {
    checked: boolean;
    disabled?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
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
      expect(container.textContent).toContain(
        'share.share.folder_current_file_unsupported'
      );
    }
  );

  it('does not normalize a disabled folder share', async () => {
    mockGet.mockResolvedValueOnce({ ...shareInfo, enabled: false });

    await act(async () => {
      root.render(
        <ShareTabContent
          namespace_id="namespace-1"
          resource_id="resource-1"
          resourceType="folder"
        />
      );
    });

    expect(mockPatch).not.toHaveBeenCalled();
    const shareSwitch = container.querySelector(
      '[role="switch"]'
    ) as HTMLButtonElement;
    expect(shareSwitch.disabled).toBe(false);
    expect(shareSwitch.getAttribute('aria-checked')).toBe('false');
  });

  it('disables sharing while the folder setting is normalized', async () => {
    let resolvePatch: (value: typeof shareInfo) => void = () => undefined;
    mockPatch.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolvePatch = resolve;
        })
    );

    await act(async () => {
      root.render(
        <ShareTabContent
          namespace_id="namespace-1"
          resource_id="resource-1"
          resourceType="folder"
        />
      );
    });

    const shareSwitch = container.querySelector(
      '[role="switch"]'
    ) as HTMLButtonElement;
    expect(shareSwitch.disabled).toBe(true);
    shareSwitch.click();
    expect(mockPatch).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePatch({ ...shareInfo, all_resources: true });
    });

    expect(shareSwitch.disabled).toBe(false);
    expect(shareSwitch.getAttribute('aria-checked')).toBe('true');
  });

  it('shows the real share state and retries when normalization fails', async () => {
    mockPatch.mockRejectedValueOnce(new Error('normalization failed'));

    await act(async () => {
      root.render(
        <ShareTabContent
          namespace_id="namespace-1"
          resource_id="resource-1"
          resourceType="folder"
        />
      );
    });

    const shareSwitch = container.querySelector(
      '[role="switch"]'
    ) as HTMLButtonElement;
    expect(shareSwitch.disabled).toBe(false);
    expect(shareSwitch.getAttribute('aria-checked')).toBe('true');
    const switches = container.querySelectorAll('[role="switch"]');
    const currentFileSwitch = switches[1] as HTMLButtonElement;
    const requireLoginSwitch = switches[2] as HTMLButtonElement;
    expect(currentFileSwitch.disabled).toBe(true);
    expect(currentFileSwitch.getAttribute('aria-checked')).toBe('true');
    expect(requireLoginSwitch.disabled).toBe(true);
    expect(
      (container.querySelector('[data-testid="share-url"]') as HTMLInputElement)
        .value
    ).toBe('');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'share.share.folder_share_update_failed'
    );

    const retryButton = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent === 'common.retry'
    );
    await act(async () => retryButton?.click());

    expect(mockPatch).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(
      (container.querySelector('[data-testid="share-url"]') as HTMLInputElement)
        .value
    ).toContain('/s/share-1');
    expect(
      container
        .querySelectorAll('[role="switch"]')[1]
        .getAttribute('aria-checked')
    ).toBe('false');
  });

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
    expect(container.textContent).not.toContain(
      'share.share.folder_current_file_unsupported'
    );
  });

  it('ignores an update response from the previous resource', async () => {
    let resolvePatch: (value: typeof shareInfo) => void = () => undefined;
    mockGet.mockImplementation((url: string) =>
      Promise.resolve(
        url.includes('resource-2')
          ? {
              ...shareInfo,
              id: 'share-2',
              resource_id: 'resource-2',
              all_resources: true,
            }
          : { ...shareInfo, all_resources: true }
      )
    );
    mockPatch.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolvePatch = resolve;
        })
    );

    await act(async () => {
      root.render(
        <ShareTabContent
          namespace_id="namespace-1"
          resource_id="resource-1"
          resourceType="doc"
        />
      );
    });

    const requireLoginSwitch = container.querySelectorAll(
      '[role="switch"]'
    )[2] as HTMLButtonElement;
    act(() => requireLoginSwitch.click());

    await act(async () => {
      root.render(
        <ShareTabContent
          namespace_id="namespace-1"
          resource_id="resource-2"
          resourceType="doc"
        />
      );
    });

    await act(async () => {
      resolvePatch({ ...shareInfo, require_login: true });
    });

    expect(
      (container.querySelector('[data-testid="share-url"]') as HTMLInputElement)
        .value
    ).toContain('/s/share-2');
  });

  it('does not normalize a folder after moving to another resource', async () => {
    let resolveGet: (value: typeof shareInfo) => void = () => undefined;
    mockGet
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveGet = resolve;
          })
      )
      .mockResolvedValueOnce({
        ...shareInfo,
        id: 'share-2',
        resource_id: 'resource-2',
        all_resources: true,
      });

    await act(async () => {
      root.render(
        <ShareTabContent
          namespace_id="namespace-1"
          resource_id="resource-1"
          resourceType="folder"
        />
      );
    });

    await act(async () => {
      root.render(
        <ShareTabContent
          namespace_id="namespace-1"
          resource_id="resource-2"
          resourceType="doc"
        />
      );
    });

    await act(async () => {
      resolveGet(shareInfo);
    });

    expect(mockPatch).not.toHaveBeenCalled();
    expect(
      (container.querySelector('[data-testid="share-url"]') as HTMLInputElement)
        .value
    ).toContain('/s/share-2');
  });
});
