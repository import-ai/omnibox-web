/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { clearConversationCache } from '@/page/chat/conversation/conversationCache';
import { removeGlobalCredential } from '@/page/user/util';

import Layout from './index';

const mockNavigate = jest.fn();
const mockHttpGet = jest.fn();
const mockToggleTheme = jest.fn();
const mockClearChatContext = jest.fn();
const mockClearCopilot = jest.fn();
const mockClearSidebar = jest.fn();
const mockResetResourcePreviews = jest.fn();
const mockEstablishServerSession = jest.fn();
const defaultLocation = { pathname: '/namespace-a/chat', search: '' };
let mockLocation = defaultLocation;
let mockParams: { namespace_id?: string; share_id?: string } = {
  namespace_id: 'namespace-a',
};

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    CancelToken: { source: () => ({ cancel: jest.fn(), token: {} }) },
  },
}));

jest.mock('react-dnd', () => ({
  DndProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('react-dnd-html5-backend', () => ({ HTML5Backend: {} }));
jest.mock('react-dnd-touch-backend', () => ({ TouchBackend: {} }));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { changeLanguage: jest.fn(), language: 'zh-CN' },
  }),
}));

jest.mock('react-router-dom', () => ({
  Outlet: () => null,
  useLocation: () => mockLocation,
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
}));

jest.mock('@/components/ui/Toaster', () => ({ Toaster: () => null }));
jest.mock('@/hooks/useMobile', () => ({ useIsMobile: () => false }));
jest.mock('@/hooks/useTheme', () => ({
  __esModule: true,
  default: () => ({
    app: { getTheme: () => ({ skin: 'light' }) },
    onToggleTheme: mockToggleTheme,
  }),
}));
jest.mock('@/lib/request', () => ({
  http: { get: (...args: unknown[]) => mockHttpGet(...args) },
}));
jest.mock('@/lib/sendTrackEvent', () => ({ track: jest.fn() }));
jest.mock('@/page/chat/chatStore', () => ({
  useChatStore: {
    getState: () => ({ clearContext: mockClearChatContext }),
  },
}));
jest.mock('@/page/chat/conversation/conversationCache', () => ({
  clearConversationCache: jest.fn(),
}));
jest.mock('@/page/copilot/copilotStore', () => ({
  useCopilotStore: {
    getState: () => ({ clearAll: mockClearCopilot }),
  },
}));
jest.mock('@/page/resource/resourceStore', () => ({
  useResourceStore: {
    getState: () => ({ resetFeaturePreviews: mockResetResourcePreviews }),
  },
}));
jest.mock('@/page/sidebar/store', () => ({
  useSidebarStore: {
    getState: () => ({ clear: mockClearSidebar }),
  },
}));
jest.mock('@/page/user/session', () => ({
  establishServerSession: (signal?: AbortSignal) =>
    mockEstablishServerSession(signal),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('Layout authentication storage changes', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie
      .split(';')
      .map(cookie => cookie.split('=')[0].trim())
      .filter(Boolean)
      .forEach(name => {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      });
    localStorage.setItem('uid', 'user-a');
    mockLocation = defaultLocation;
    mockParams = { namespace_id: 'namespace-a' };
    mockNavigate.mockClear();
    mockHttpGet.mockReset();
    mockHttpGet.mockResolvedValue([]);
    mockToggleTheme.mockClear();
    jest.mocked(clearConversationCache).mockClear();
    mockClearChatContext.mockClear();
    mockClearCopilot.mockClear();
    mockClearSidebar.mockClear();
    mockResetResourcePreviews.mockClear();
    mockEstablishServerSession.mockReset();
    mockEstablishServerSession.mockResolvedValue('user-a');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('restores the account color theme together with appearance', async () => {
    mockHttpGet.mockResolvedValue([
      { name: 'theme', value: 'dark' },
      { name: 'color_theme', value: 'zinc' },
      { name: 'font', value: 'geist' },
    ]);
    await act(async () => root.render(<Layout />));
    expect(mockToggleTheme).toHaveBeenLastCalledWith('dark', 'zinc', 'geist');
  });

  it('syncs color themes from another tab and ignores malformed storage', async () => {
    await act(async () => root.render(<Layout />));
    mockToggleTheme.mockClear();
    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'theme',
          newValue: JSON.stringify({
            skin: 'light',
            colorTheme: 'stone',
            font: 'roboto',
          }),
        })
      );
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'theme',
          newValue: '{invalid',
        })
      );
    });
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
    expect(mockToggleTheme).toHaveBeenCalledWith('light', 'stone', 'roboto');
  });

  it('clears conversation and workspace state when another tab changes uid', async () => {
    await act(async () => root.render(<Layout />));
    localStorage.setItem('uid', 'user-b');

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'uid',
          oldValue: 'user-a',
          newValue: 'user-b',
        })
      );
    });

    expect(clearConversationCache).toHaveBeenCalledTimes(1);
    expect(mockClearChatContext).toHaveBeenCalledTimes(1);
    expect(mockClearCopilot).toHaveBeenCalledTimes(1);
    expect(mockClearSidebar).toHaveBeenCalledTimes(1);
    expect(mockResetResourcePreviews).toHaveBeenCalledTimes(1);
  });

  describe('root redirect', () => {
    beforeEach(() => {
      mockLocation = { pathname: '/', search: '' };
      mockParams = {};
    });

    function namespaceResponse() {
      return [{ id: 'namespace-a' }, { id: 'namespace-b' }];
    }

    it('lands on the last visited namespace', async () => {
      localStorage.setItem('last_namespace_id', 'namespace-b');
      mockHttpGet.mockImplementation((url: string) => {
        if (url === '/config') return Promise.resolve({ commercial: false });
        if (url === 'namespaces') return Promise.resolve(namespaceResponse());
        return Promise.resolve([]);
      });

      await act(async () => root.render(<Layout />));

      expect(mockNavigate).toHaveBeenCalledWith('/namespace-b/chat', {
        replace: true,
      });
    });

    it('keeps a pending invite referral entry', async () => {
      sessionStorage.setItem('omnibox.inviteReferral.landing', 'activation');
      mockHttpGet.mockImplementation((url: string) => {
        if (url === '/config') return Promise.resolve({ commercial: false });
        if (url === 'namespaces') return Promise.resolve(namespaceResponse());
        return Promise.resolve([]);
      });

      await act(async () => root.render(<Layout />));

      expect(mockNavigate).toHaveBeenCalledWith(
        '/namespace-a/invite-referral?entry=activation',
        { replace: true }
      );
    });

    it('uses the commercial namespace endpoint when configured', async () => {
      mockHttpGet.mockImplementation((url: string) => {
        if (url === '/config') return Promise.resolve({ commercial: true });
        if (url === 'pro-namespaces')
          return Promise.resolve(namespaceResponse());
        return Promise.resolve([]);
      });

      await act(async () => root.render(<Layout />));

      expect(mockHttpGet).toHaveBeenCalledWith('pro-namespaces');
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/namespace-a/chat', {
        replace: true,
      });
    });

    it('falls back to welcome when namespaces cannot be loaded', async () => {
      mockHttpGet.mockImplementation((url: string) => {
        if (url === '/config') return Promise.resolve({ commercial: false });
        if (url === 'namespaces') return Promise.reject(new Error('offline'));
        return Promise.resolve([]);
      });

      await act(async () => root.render(<Layout />));

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/welcome', { replace: true });
    });

    it('restores the signed-in user from the session cookie', async () => {
      localStorage.removeItem('uid');
      mockEstablishServerSession.mockResolvedValue('user-a');
      mockHttpGet.mockImplementation((url: string) => {
        if (url === '/config') return Promise.resolve({ commercial: false });
        if (url === 'namespaces') return Promise.resolve(namespaceResponse());
        return Promise.resolve([]);
      });

      await act(async () => root.render(<Layout />));

      expect(localStorage.getItem('uid')).toBe('user-a');
      expect(mockNavigate).toHaveBeenCalledWith('/namespace-a/chat', {
        replace: true,
      });
    });

    it('asks for login when the session cannot be restored', async () => {
      localStorage.removeItem('uid');
      mockEstablishServerSession.mockRejectedValue(new Error('unauthorized'));

      await act(async () => root.render(<Layout />));

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate.mock.calls[0][0]).toMatch(
        /^\/user\/login\?redirect=/
      );
    });

    it('ignores a session response that arrives after the account changed', async () => {
      localStorage.removeItem('uid');
      let resolveSession: (uid: string) => void = () => undefined;
      mockEstablishServerSession.mockReturnValue(
        new Promise<string>(resolve => {
          resolveSession = resolve;
        })
      );

      await act(async () => root.render(<Layout />));

      localStorage.setItem('uid', 'user-b');
      localStorage.setItem('token', 'token-b');
      await act(async () => {
        resolveSession('user-a');
      });

      expect(localStorage.getItem('uid')).toBe('user-b');
      expect(localStorage.getItem('token')).toBe('token-b');
    });

    it('ignores a session response after an auth storage change', async () => {
      localStorage.removeItem('uid');
      let resolveSession: (uid: string) => void = () => undefined;
      mockEstablishServerSession.mockReturnValue(
        new Promise<string>(resolve => {
          resolveSession = resolve;
        })
      );

      await act(async () => root.render(<Layout />));

      await act(async () => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'uid',
            oldValue: 'user-a',
            newValue: null,
          })
        );
      });
      await act(async () => {
        resolveSession('user-a');
      });

      expect(localStorage.getItem('uid')).toBeNull();
    });

    it('cancels the in-flight session refresh when this tab signs out', async () => {
      localStorage.removeItem('uid');
      localStorage.removeItem('token');
      let sessionSignal: AbortSignal | undefined;
      mockEstablishServerSession.mockImplementation((signal?: AbortSignal) => {
        sessionSignal = signal;
        return new Promise<string>(() => undefined);
      });

      await act(async () => root.render(<Layout />));
      expect(sessionSignal?.aborted).toBe(false);

      await act(async () => {
        removeGlobalCredential();
      });

      expect(sessionSignal?.aborted).toBe(true);
      expect(localStorage.getItem('uid')).toBeNull();
    });

    it('keeps the cookie cleared when a cancelled refresh resolves late', async () => {
      localStorage.removeItem('uid');
      localStorage.removeItem('token');
      document.cookie = 'token=stale; path=/';
      let deliverResponse: () => void = () => undefined;
      mockEstablishServerSession.mockImplementation((signal?: AbortSignal) => {
        return new Promise<string>((resolve, reject) => {
          deliverResponse = () => {
            // A browser drops the whole response, including its Set-Cookie
            // header, once the request has been aborted.
            if (signal?.aborted) {
              reject(new Error('canceled'));
              return;
            }
            document.cookie = 'token=refreshed; path=/';
            resolve('user-a');
          };
        });
      });

      await act(async () => root.render(<Layout />));
      await act(async () => {
        removeGlobalCredential();
      });
      await act(async () => {
        deliverResponse();
      });

      expect(document.cookie).not.toMatch(/token=(stale|refreshed)/);
      expect(localStorage.getItem('uid')).toBeNull();
    });
  });
});
