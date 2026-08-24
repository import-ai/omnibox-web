/** @jest-environment jsdom */

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import LoginPage from './index';

const navigate = jest.fn();
let searchParams = new URLSearchParams();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useSearchParams: () => [searchParams],
}));
jest.mock('../apple', () => () => null);
jest.mock('../available', () => ({ Available: () => null }));
jest.mock('../email', () => () => null);
jest.mock('../google', () => () => null);
jest.mock('../MetaPage', () => ({ __esModule: true, default: () => null }));
jest.mock('../phone', () => () => null);
jest.mock('../wechat', () => () => null);
jest.mock('../wechat/h5WechatAuthSync', () => ({
  useH5WechatAuthPoll: jest.fn(),
}));
jest.mock('../wechat/Scan', () => () => null);
jest.mock('../WrapperPage', () => ({
  __esModule: true,
  default: ({ children }: { children?: ReactNode }) => children,
}));
jest.mock('./LoginForm', () => ({
  LoginForm: () => null,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('LoginPage authenticated redirect', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('uid', 'user-1');
    searchParams = new URLSearchParams();
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  it('opens the shared resource from the login redirect', async () => {
    searchParams = new URLSearchParams('redirect=%2Fs%2Fshare-1%2Fresource-1');

    await act(async () => root.render(<LoginPage />));

    expect(navigate).toHaveBeenCalledWith('/s/share-1/resource-1', {
      replace: true,
    });
  });

  it('keeps the home fallback when no redirect is provided', async () => {
    await act(async () => root.render(<LoginPage />));

    expect(navigate).toHaveBeenCalledWith('/', { replace: true });
  });
});
