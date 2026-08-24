/** @jest-environment jsdom */

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { getAuthSuccessRedirect } from '@/page/user/authRedirect';

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
jest.mock('@/page/user/authRedirect', () => ({
  getAuthSuccessRedirect: jest.fn(),
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
  LoginForm: () => <div data-testid="login-form" />,
}));

const mockGetAuthSuccessRedirect = jest.mocked(getAuthSuccessRedirect);

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
    mockGetAuthSuccessRedirect.mockResolvedValue('/');
    searchParams = new URLSearchParams();
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  it('hides the login form while opening the shared resource', async () => {
    let resolveRedirect: (target: string) => void = () => undefined;
    mockGetAuthSuccessRedirect.mockReturnValue(
      new Promise(resolve => {
        resolveRedirect = resolve;
      })
    );
    searchParams = new URLSearchParams('redirect=%2Fs%2Fshare-1%2Fresource-1');

    await act(async () => root.render(<LoginPage />));

    expect(container.querySelector('[data-testid="login-form"]')).toBeNull();
    expect(container.querySelector('[role="status"]')).not.toBeNull();
    expect(navigate).not.toHaveBeenCalled();

    await act(async () => {
      resolveRedirect('/s/share-1/resource-1');
    });

    expect(navigate).toHaveBeenCalledWith('/s/share-1/resource-1', {
      replace: true,
    });
  });

  it('keeps the home fallback when no redirect is provided', async () => {
    await act(async () => root.render(<LoginPage />));

    expect(container.querySelector('[data-testid="login-form"]')).toBeNull();
    expect(container.querySelector('[role="status"]')).not.toBeNull();
    expect(navigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('shows the login form when there is no existing session', async () => {
    localStorage.clear();

    await act(async () => root.render(<LoginPage />));

    expect(
      container.querySelector('[data-testid="login-form"]')
    ).not.toBeNull();
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(mockGetAuthSuccessRedirect).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
