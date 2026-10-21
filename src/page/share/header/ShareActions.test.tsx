/** @jest-environment jsdom */

import copy from 'copy-to-clipboard';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { PublicSiteOriginContext } from '@/hooks/publicSiteContext';

import ShareActions from './ShareActions';

jest.mock('copy-to-clipboard', () => ({
  __esModule: true,
  default: jest.fn(() => true),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('sonner', () => ({ toast: jest.fn() }));
jest.mock('@/components/ui/DropdownMenu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => children,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => children,
  DropdownMenuItem: 'button',
  DropdownMenuSeparator: () => null,
  DropdownMenuSub: ({ children }: { children: ReactNode }) => children,
  DropdownMenuSubContent: ({ children }: { children: ReactNode }) => children,
  DropdownMenuSubTrigger: 'span',
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => children,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('shared-page copy link', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.clearAllMocks();
    history.replaceState(null, '', '/s/share-1/doc-2?view=wide#heading');
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    history.replaceState(null, '', '/');
  });

  const renderWithOrigin = async (origin?: string | null) => {
    await act(async () => {
      root.render(
        <PublicSiteOriginContext.Provider value={origin}>
          <ShareActions
            resource={{
              id: 'doc-2',
              resource_type: 'doc',
              content: '# Shared',
            }}
          />
        </PublicSiteOriginContext.Provider>
      );
    });
    return Array.from(container.querySelectorAll('button')).find(
      button => button.textContent === 'actions.copy_link'
    )!;
  };

  it('copies the host URL preserving the share subpage, query and hash', async () => {
    const button = await renderWithOrigin('https://pre.omnibox.pro');
    await act(async () => button.click());
    expect(copy).toHaveBeenCalledWith(
      'https://pre.omnibox.pro/s/share-1/doc-2?view=wide#heading'
    );
  });

  it('still copies the current browser URL without a host override', async () => {
    const button = await renderWithOrigin();
    await act(async () => button.click());
    expect(copy).toHaveBeenCalledWith(location.href);
  });

  it.each([null, '', 'omnibox://app'])(
    'disables copying for %s',
    async origin => {
      const button = await renderWithOrigin(origin);
      expect(button.disabled).toBe(true);
      expect(container.querySelector('[role="alert"]')?.textContent).toContain(
        'share.share.url_unavailable'
      );
      await act(async () => button.click());
      expect(copy).not.toHaveBeenCalled();
    }
  );

  it('keeps copy-content available when the host origin is unavailable', async () => {
    await renderWithOrigin(null);
    const button = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent === 'actions.copy_content'
    )!;
    await act(async () => button.click());
    expect(copy).toHaveBeenCalledWith(
      '# Shared',
      expect.objectContaining({ format: 'text/plain' })
    );
  });
});
