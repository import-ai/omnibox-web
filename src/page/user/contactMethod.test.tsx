/** @jest-environment jsdom */

import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

import LoginPage from './login';
import RegisterPage from './register';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useSearchParams: () => [new URLSearchParams()],
}));
jest.mock('@/page/user/authRedirect', () => ({
  getAuthSuccessRedirect: jest.fn(),
}));
jest.mock('@/components/button', () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));
jest.mock('./available', () => ({
  Available: ({ children }: { children: (config: object) => ReactNode }) =>
    children({ wechat: false, google: false, apple: false }),
}));
jest.mock('./apple', () => () => <button>Apple</button>);
jest.mock('./google', () => () => <button>Google</button>);
jest.mock('./wechat', () => () => <button>WeChat</button>);
jest.mock('./wechat/h5WechatAuthSync', () => ({
  useH5WechatAuthPoll: jest.fn(),
}));
jest.mock('./wechat/Scan', () => () => null);
jest.mock('./MetaPage', () => ({ __esModule: true, default: () => null }));
jest.mock('./WrapperPage', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('./login/LoginForm', () => ({
  LoginForm: ({
    children,
    contactMethod,
  }: {
    children: ReactNode;
    contactMethod: string;
  }) => <div data-contact={contactMethod}>{children}</div>,
}));
jest.mock('./register/RegisterForm', () => ({
  RegisterForm: ({
    children,
    contactMethod,
  }: {
    children: ReactNode;
    contactMethod: string;
  }) => <div data-contact={contactMethod}>{children}</div>,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

it.each([
  ['login', LoginPage, 'login.login_use_phone', 'login.login_use_email'],
  [
    'register',
    RegisterPage,
    'register.register_use_phone',
    'register.register_use_email',
  ],
] as const)(
  'switches %s contact methods without OAuth providers',
  async (_name, Page, phoneLabel, emailLabel) => {
    localStorage.clear();
    const container = document.createElement('div');
    const root = createRoot(container);
    const button = () => container.querySelector('button')!;
    try {
      await act(async () => root.render(<Page />));
      expect(
        container.querySelector('[data-contact]')?.getAttribute('data-contact')
      ).toBe('phone');
      expect(button().textContent).toBe(emailLabel);
      await act(async () => button().click());
      expect(
        container.querySelector('[data-contact]')?.getAttribute('data-contact')
      ).toBe('email');
      expect(button().textContent).toBe(phoneLabel);
      await act(async () => button().click());
      expect(
        container.querySelector('[data-contact]')?.getAttribute('data-contact')
      ).toBe('phone');
      expect(container.querySelectorAll('button')).toHaveLength(1);
    } finally {
      await act(async () => root.unmount());
    }
  }
);
