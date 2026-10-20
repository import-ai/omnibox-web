/** @jest-environment jsdom */

import copy from 'copy-to-clipboard';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { PublicSiteOriginContext } from '@/hooks/publicSiteContext';

import InvitePeople from './InvitePeople';

const mockShowToast = jest.fn();

jest.mock('copy-to-clipboard', () => ({
  __esModule: true,
  default: jest.fn(() => true),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/page/settings/SettingsToastProvider', () => ({
  useSettingsToast: () => ({ showToast: mockShowToast }),
}));
jest.mock('@/lib/request', () => ({
  http: {
    delete: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
  },
}));
jest.mock('@/components/ui/Dialog', () => ({
  Dialog: ({ children }: { children?: ReactNode }) => children,
  DialogContent: ({ children }: { children?: ReactNode }) => children,
  DialogDescription: () => null,
  DialogHeader: ({ children }: { children?: ReactNode }) => children,
  DialogTitle: () => null,
}));
jest.mock('@/components/ui/Switch', () => ({
  Switch: () => null,
}));
jest.mock('./AddNamespaceInvitationForm', () => ({
  AddNamespaceInvitationForm: () => null,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('InvitePeople copy link', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  const renderWithOrigin = async (origin?: string | null) => {
    await act(async () => {
      root.render(
        <PublicSiteOriginContext.Provider value={origin}>
          <InvitePeople
            namespaceId="namespace-1"
            invitationId="invitation-1"
            refetch={jest.fn()}
          />
        </PublicSiteOriginContext.Provider>
      );
    });
    return Array.from(container.querySelectorAll('span')).find(
      element => element.textContent === 'actions.copy_link'
    )!;
  };

  it('copies the invitation URL from the host public site', async () => {
    const copyLink = await renderWithOrigin('https://test.omnibox.pro');
    await act(async () => copyLink.click());

    expect(copy).toHaveBeenCalledWith(
      'https://test.omnibox.pro/invite/namespace-1/invitation-1',
      { format: 'text/plain' }
    );
    expect(mockShowToast).toHaveBeenCalledWith(
      'actions.copy_link_success',
      'success'
    );
  });

  it('uses the browser origin without a host override', async () => {
    const copyLink = await renderWithOrigin();
    await act(async () => copyLink.click());

    expect(copy).toHaveBeenCalledWith(
      `${location.origin}/invite/namespace-1/invitation-1`,
      { format: 'text/plain' }
    );
  });

  it.each([null, '', 'omnibox://app'])(
    'blocks copying for unavailable origin %s',
    async origin => {
      const copyLink = await renderWithOrigin(origin);
      await act(async () => copyLink.click());

      expect(copy).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(
        'share.share.url_unavailable',
        'error'
      );
    }
  );
});
