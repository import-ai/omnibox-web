/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { openFilePicker } from '@/lib/openFilePicker';
import { http } from '@/lib/request';
import { trackButtonClick } from '@/lib/trackButtonClick';

import FeatureCards from './FeatureCards';

const mockFire = jest.fn();

jest.mock('react-i18next', () => ({
  __esModule: true,
  default: {
    initReactI18next: {
      type: '3rdParty',
      init: jest.fn(),
    },
  },
  useTranslation: () => ({
    i18n: { language: 'zh-CN' },
    t: (key: string) => key,
  }),
}));

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useParams: () => ({ namespace_id: 'space' }),
}));

jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => ({ fire: mockFire }),
}));

jest.mock('@/lib/request', () => ({
  http: { get: jest.fn() },
}));

jest.mock('@/lib/openFilePicker', () => ({
  openFilePicker: jest.fn(),
}));

jest.mock('@/const', () => ({
  ALLOW_FILE_EXTENSIONS: '.txt',
}));

jest.mock('@/components/ui/Card', () => ({
  Card: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardTitle: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));

jest.mock('@/components/ui/Spinner', () => ({
  Spinner: () => <span>loading</span>,
}));

jest.mock('./AddLinkPanel', () => ({
  AddLinkPanel: () => <input aria-label="Link panel" />,
}));

Object.assign(globalThis, {
  IS_REACT_ACT_ENVIRONMENT: true,
  ResizeObserver: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});
jest.mock('@/lib/behaviorTracking', () => ({ useBehaviorSurface: jest.fn() }));

describe('FeatureCards', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(http.get).mockResolvedValue([]);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('opens the file picker from the local upload entry', async () => {
    await act(async () => root.render(<FeatureCards />));
    const button = [...container.querySelectorAll('button')].find(
      button => button.textContent === 'chat.home.upload.local'
    )!;
    await act(async () => button.click());
    expect(openFilePicker).toHaveBeenCalledWith(
      container.querySelector('input[type=file]')
    );
    expect(trackButtonClick).toHaveBeenCalledWith(
      'chat_file_upload',
      expect.any(Object)
    );
  });

  it('opens the link panel from the add link entry', async () => {
    await act(async () => root.render(<FeatureCards />));
    const button = [...container.querySelectorAll('button')].find(
      button => button.textContent === 'chat.home.upload.link'
    )!;
    await act(async () => button.click());
    expect(
      container.querySelector('input[aria-label="Link panel"]')
    ).not.toBeNull();
    expect(trackButtonClick).toHaveBeenCalledWith(
      'chat_link_open',
      expect.any(Object)
    );
  });

  it('opens browser extension help from the extension entry', async () => {
    const open = jest.spyOn(window, 'open').mockImplementation(() => null);
    try {
      await act(async () => root.render(<FeatureCards />));
      const button = [...container.querySelectorAll('button')].find(
        button => button.textContent === 'chat.home.upload.browser'
      )!;
      await act(async () => button.click());
      expect(open).toHaveBeenCalledWith(
        '/docs/zh-cn/browser-extension',
        '_blank'
      );
    } finally {
      open.mockRestore();
    }
  });

  it('opens WeChat AI assistant binding from the WeChat entry', async () => {
    await act(async () => root.render(<FeatureCards />));

    const wechatButton = [...container.querySelectorAll('button')].find(
      button => button.textContent === 'chat.home.upload.wechat'
    );

    expect(wechatButton).toBeDefined();
    await act(async () => wechatButton?.click());

    expect(mockFire).toHaveBeenCalledWith('open_settings', {
      tab: 'applications',
      autoAction: {
        type: 'bind',
        appId: 'wechat_oa_bot',
      },
    });
  });
});
