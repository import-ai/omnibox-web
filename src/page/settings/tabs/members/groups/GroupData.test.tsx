/** @jest-environment jsdom */

import copy from 'copy-to-clipboard';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { PublicSiteOriginContext } from '@/hooks/publicSiteContext';

import GroupData from './GroupData';

const mockShowToast = jest.fn();

jest.mock('copy-to-clipboard', () => ({
  __esModule: true,
  default: jest.fn(() => true),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('../../../SettingsToastProvider', () => ({
  useSettingsToast: () => ({ showToast: mockShowToast }),
}));
jest.mock('@/lib/request', () => ({
  http: {
    delete: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
  },
}));
jest.mock('./useGroupUser', () => ({
  __esModule: true,
  default: () => ({
    groupUserData: [],
    onRemove: jest.fn(),
    groupUserRefetch: jest.fn(),
  }),
}));
jest.mock('./GroupDataUser', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/components/tooltip', () => ({
  Tooltip: ({ children }: { children?: ReactNode }) => children,
  TooltipContent: () => null,
  TooltipTrigger: ({ children }: { children?: ReactNode }) => children,
}));
jest.mock('@/components/ui/Collapsible', () => ({
  Collapsible: ({ children }: { children?: ReactNode }) => children,
  CollapsibleContent: ({ children }: { children?: ReactNode }) => children,
  CollapsibleTrigger: ({ children }: { children?: ReactNode }) => children,
}));
jest.mock('@/components/ui/Switch', () => ({
  Switch: () => null,
}));
jest.mock('@/components/ui/AlertDialog', () => ({
  AlertDialog: ({ children }: { children?: ReactNode }) => children,
  AlertDialogAction: () => null,
  AlertDialogCancel: () => null,
  AlertDialogContent: ({ children }: { children?: ReactNode }) => children,
  AlertDialogDescription: () => null,
  AlertDialogFooter: ({ children }: { children?: ReactNode }) => children,
  AlertDialogHeader: ({ children }: { children?: ReactNode }) => children,
  AlertDialogTitle: () => null,
  AlertDialogTrigger: ({ children }: { children?: ReactNode }) => children,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('GroupData copy link', () => {
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
          <GroupData
            id="group-1"
            title="Engineering"
            invitation_id="invitation-1"
            member={[]}
            namespace_id="namespace-1"
            onEdit={jest.fn()}
            refetch={jest.fn()}
          />
        </PublicSiteOriginContext.Provider>
      );
    });
    return Array.from(container.querySelectorAll('button')).find(button =>
      button.querySelector('.lucide-copy')
    )!;
  };

  it('copies the invitation URL from the host public site', async () => {
    const copyButton = await renderWithOrigin('https://pre.omnibox.pro');
    await act(async () => copyButton.click());

    expect(copy).toHaveBeenCalledWith(
      'https://pre.omnibox.pro/invite/namespace-1/invitation-1',
      { format: 'text/plain' }
    );
    expect(mockShowToast).toHaveBeenCalledWith(
      'actions.copy_link_success',
      'success'
    );
  });

  it('uses the browser origin without a host override', async () => {
    const copyButton = await renderWithOrigin();
    await act(async () => copyButton.click());

    expect(copy).toHaveBeenCalledWith(
      `${location.origin}/invite/namespace-1/invitation-1`,
      { format: 'text/plain' }
    );
  });

  it.each([null, '', 'omnibox://app'])(
    'blocks copying for unavailable origin %s',
    async origin => {
      const copyButton = await renderWithOrigin(origin);
      await act(async () => copyButton.click());

      expect(copy).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(
        'share.share.url_unavailable',
        'error'
      );
    }
  );
});
