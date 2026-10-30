/** @jest-environment jsdom */

import * as React from 'react';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { http } from '@/lib/request';

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

jest.mock('@/components/Button', () => ({
  Button: ({
    children,
    onClick,
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock('@/components/tooltip', () => ({
  Tooltip: ({ children }: React.PropsWithChildren) => <>{children}</>,
  TooltipProvider: ({ children }: React.PropsWithChildren) => <>{children}</>,
  TooltipTrigger: ({ children }: React.PropsWithChildren) => <>{children}</>,
  TooltipContent: ({ children }: React.PropsWithChildren) => <>{children}</>,
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
  AddLinkPanel: () => null,
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

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
