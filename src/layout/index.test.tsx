/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { clearConversationCache } from '@/page/chat/conversation/conversationCache';

import Layout from './index';

const mockNavigate = jest.fn();
const mockHttpGet = jest.fn();
const mockClearChatContext = jest.fn();
const mockClearCopilot = jest.fn();
const mockClearSidebar = jest.fn();
const mockResetResourcePreviews = jest.fn();

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
  useLocation: () => ({ pathname: '/namespace-a/chat', search: '' }),
  useNavigate: () => mockNavigate,
  useParams: () => ({ namespace_id: 'namespace-a' }),
}));

jest.mock('@/components/ui/Toaster', () => ({ Toaster: () => null }));
jest.mock('@/hooks/useMobile', () => ({ useIsMobile: () => false }));
jest.mock('@/hooks/useTheme', () => ({
  __esModule: true,
  default: () => ({
    app: { getTheme: () => ({ skin: 'light' }) },
    onToggleTheme: jest.fn(),
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

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('Layout authentication storage changes', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('uid', 'user-a');
    mockHttpGet.mockReset();
    mockHttpGet.mockResolvedValue([]);
    jest.mocked(clearConversationCache).mockClear();
    mockClearChatContext.mockClear();
    mockClearCopilot.mockClear();
    mockClearSidebar.mockClear();
    mockResetResourcePreviews.mockClear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
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
});
