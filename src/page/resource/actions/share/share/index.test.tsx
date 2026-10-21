/** @jest-environment jsdom */

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { PublicSiteOriginContext } from '@/hooks/publicSiteContext';
import { ResourceType } from '@/interface';
import type { ResourceSortOptions } from '@/service/resource';

import ShareTabs from '../ShareTabs';
import { ShareTabContent } from '.';

const mockGet = jest.fn();
const mockPatch = jest.fn();
const mockWriteText = jest.fn().mockResolvedValue(undefined);

jest.mock('react-i18next', () => ({
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));
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
jest.mock('@/components/tooltip', () => ({
  Tooltip: ({ children }: { children?: ReactNode }) => children,
  TooltipContent: ({ children }: { children?: ReactNode }) => (
    <span data-testid="tooltip-content">{children}</span>
  ),
  TooltipProvider: ({ children }: { children?: ReactNode }) => children,
  TooltipTrigger: ({ children }: { children?: ReactNode }) => children,
}));
jest.mock('@/components/Button', () => ({
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
jest.mock('@/components/ui/Tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children, value }: { children: ReactNode; value: string }) =>
    value === 'share' ? <div>{children}</div> : null,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));
jest.mock('../permissions/InviteForm', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../permissions/table', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('./Expire', () => ({ Expire: () => null }));
jest.mock('./Password', () => ({ Password: () => null }));
jest.mock('./ShareSortSelector', () => ({
  ShareSortSelector: ({
    disabled,
    onChange,
  }: {
    disabled: boolean;
    onChange: (sort: ResourceSortOptions) => void;
  }) => (
    <button
      type="button"
      data-testid="share-sort-selector"
      disabled={disabled}
      onClick={() => onChange({ sort_by: 'title', sort_order: 'asc' })}
    />
  ),
}));
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
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: mockWriteText },
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  const renderWithOrigin = async (origin?: string | null) => {
    await act(async () => {
      root.render(
        <PublicSiteOriginContext.Provider value={origin}>
          <ShareTabContent
            namespace_id="namespace-1"
            resource_id="resource-1"
            resourceType="doc"
          />
        </PublicSiteOriginContext.Provider>
      );
    });
    const input = container.querySelector<HTMLInputElement>(
      '[data-testid="share-url"]'
    )!;
    const sibling = input.nextElementSibling;
    const copyButton = (
      sibling instanceof HTMLButtonElement
        ? sibling
        : sibling?.querySelector('button')
    ) as HTMLButtonElement;
    return { input, copyButton };
  };

  it.each([
    'https://test.omnibox.pro',
    'https://pre.omnibox.pro',
    'https://www.omnibox.pro',
    'http://127.0.0.1:43123',
  ])('displays and copies the host share URL for %s', async origin => {
    const { input, copyButton } = await renderWithOrigin(origin);
    expect(input.value).toBe(`${origin}/s/share-1`);
    expect(copyButton.disabled).toBe(false);
    await act(async () => copyButton.click());
    expect(mockWriteText).toHaveBeenCalledWith(input.value);
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('keeps the browser origin when no host origin is provided', async () => {
    const { input, copyButton } = await renderWithOrigin();
    expect(input.value).toBe(`${location.origin}/s/share-1`);
    await act(async () => copyButton.click());
    expect(mockWriteText).toHaveBeenCalledWith(input.value);
  });

  it.each([
    null,
    '',
    'not a URL',
    'omnibox://app',
    'javascript:alert(1)',
    'https://user:password@example.com',
    'https://example.com/path',
    'https://example.com?target=other',
    'https://example.com#hash',
  ])(
    'blocks copying and explains an unavailable host origin: %s',
    async origin => {
      const { input, copyButton } = await renderWithOrigin(origin);
      expect(input.value).toBe('');
      expect(copyButton.disabled).toBe(true);
      expect(container.querySelector('[role="alert"]')?.textContent).toContain(
        'share.share.url_unavailable'
      );
      await act(async () => copyButton.click());
      expect(mockWriteText).not.toHaveBeenCalled();
      expect(mockPatch).not.toHaveBeenCalled();
    }
  );

  it('does not expose a URL when sharing is off', async () => {
    mockGet.mockResolvedValueOnce({ ...shareInfo, enabled: false });
    const { input, copyButton } = await renderWithOrigin(
      'https://test.omnibox.pro'
    );
    expect(input.value).toBe('');
    expect(copyButton.disabled).toBe(true);
    expect(container.querySelector('[role="alert"]')).toBeNull();
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
      expect(
        container.querySelector('[data-testid="tooltip-content"]')?.textContent
      ).toBe('share.share.folder_current_file_unsupported');
    }
  );

  it.each([
    ['smart_folder', 'share.share.sort.smart_folder_unsupported'],
    ['rss_folder', 'share.share.sort.rss_folder_unsupported'],
  ] as const)(
    'disables share sorting for %s',
    async (resourceType, tooltipKey) => {
      await act(async () => {
        root.render(
          <ShareTabContent
            namespace_id="namespace-1"
            resource_id="resource-1"
            resourceType={resourceType}
          />
        );
      });

      const sortSelector = container.querySelector(
        '[data-testid="share-sort-selector"]'
      ) as HTMLButtonElement;
      expect(sortSelector.disabled).toBe(true);
      expect(
        Array.from(
          container.querySelectorAll('[data-testid="tooltip-content"]')
        ).some(tooltip => tooltip.textContent === tooltipKey)
      ).toBe(true);
    }
  );

  it('keeps share sorting available for a regular folder', async () => {
    await act(async () => {
      root.render(
        <ShareTabContent
          namespace_id="namespace-1"
          resource_id="resource-1"
          resourceType="folder"
        />
      );
    });

    const sortSelector = container.querySelector(
      '[data-testid="share-sort-selector"]'
    ) as HTMLButtonElement;
    expect(sortSelector.disabled).toBe(false);
  });

  it('disables share sorting for a chat-only share', async () => {
    mockGet.mockResolvedValue({
      ...shareInfo,
      all_resources: true,
      share_type: 'chat_only',
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

    const sortSelector = container.querySelector(
      '[data-testid="share-sort-selector"]'
    ) as HTMLButtonElement;
    expect(sortSelector.disabled).toBe(true);
    // Sharing child resources still decides what the assistant can read.
    const switches = container.querySelectorAll('[role="switch"]');
    expect(
      (switches[1] as HTMLButtonElement).getAttribute('aria-checked')
    ).toBe('false');
  });

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
    const copyButton = container.querySelector(
      '.cursor-not-allowed button'
    ) as HTMLButtonElement;
    expect(copyButton.disabled).toBe(true);
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

  it('waits for a pending update before retrying normalization', async () => {
    let resolveUpdate: (value: typeof shareInfo) => void = () => undefined;
    mockGet.mockResolvedValueOnce(shareInfo).mockResolvedValueOnce({
      ...shareInfo,
      enabled: false,
      all_resources: true,
    });
    mockPatch
      .mockRejectedValueOnce(new Error('normalization failed'))
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveUpdate = resolve;
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
    await act(async () => {
      shareSwitch.click();
      await Promise.resolve();
    });
    const retryButton = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent === 'common.retry'
    );
    await act(async () => retryButton?.click());
    expect(mockGet).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveUpdate({ ...shareInfo, enabled: false, all_resources: true });
    });

    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(mockPatch).toHaveBeenCalledTimes(2);
    expect(shareSwitch.getAttribute('aria-checked')).toBe('false');
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
    expect(
      container.querySelector('[data-testid="tooltip-content"]')
    ).toBeNull();
  });

  it('loads sharing from the explicit resource snapshot', async () => {
    await act(async () => {
      root.render(
        <ShareTabs
          namespaceId="namespace-snapshot"
          resourceId="resource-snapshot"
          resourceType="doc"
        />
      );
    });

    expect(mockGet).toHaveBeenCalledWith(
      'namespaces/namespace-snapshot/resources/resource-snapshot/share'
    );
  });

  it('serializes updates for the same resource', async () => {
    let resolveFirstPatch: (value: typeof shareInfo) => void = () => undefined;
    let resolveSecondPatch: (value: typeof shareInfo) => void = () => undefined;
    mockGet.mockResolvedValueOnce({ ...shareInfo, all_resources: true });
    mockPatch
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveFirstPatch = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveSecondPatch = resolve;
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

    const switches = container.querySelectorAll('[role="switch"]');
    const currentFileSwitch = switches[1] as HTMLButtonElement;
    const requireLoginSwitch = switches[2] as HTMLButtonElement;
    await act(async () => {
      requireLoginSwitch.click();
      currentFileSwitch.click();
      await Promise.resolve();
    });

    expect(mockPatch).toHaveBeenCalledTimes(1);
    expect(mockPatch).toHaveBeenNthCalledWith(
      1,
      'namespaces/namespace-1/resources/resource-1/share',
      { require_login: true }
    );

    await act(async () => {
      resolveFirstPatch({
        ...shareInfo,
        all_resources: true,
        require_login: true,
      });
      await Promise.resolve();
    });

    expect(mockPatch).toHaveBeenCalledTimes(2);
    expect(mockPatch).toHaveBeenNthCalledWith(
      2,
      'namespaces/namespace-1/resources/resource-1/share',
      { all_resources: false }
    );

    await act(async () => {
      resolveSecondPatch({
        ...shareInfo,
        all_resources: false,
        require_login: true,
      });
    });

    const updatedSwitches = container.querySelectorAll('[role="switch"]');
    expect(updatedSwitches[1].getAttribute('aria-checked')).toBe('true');
    expect(updatedSwitches[2].getAttribute('aria-checked')).toBe('true');
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
