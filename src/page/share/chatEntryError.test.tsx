/** @jest-environment jsdom */
import { createInstance } from 'i18next';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import en from '@/i18n/locales/en.json';
import zh from '@/i18n/locales/zh.json';
import { http } from '@/lib/request';

import SharePage from './index';

const navigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useParams: () => ({ share_id: 'share' }),
  useLocation: () => ({ pathname: '/s/share/chat' }),
  useNavigate: () => navigate,
}));
jest.mock('@/lib/request', () => ({ http: { get: jest.fn() } }));
jest.mock('@/assets/deleteIcon.png', () => 'image');
jest.mock('@/components/loading', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/components/ui/Sidebar', () => ({ SidebarProvider: () => null }));
jest.mock('@/lib/resourceMeta', () => ({ normalizeResourceMeta: jest.fn() }));
jest.mock('@/page/share/sidebar/navigation', () => ({
  getShareSmartFolderChildNavigationState: jest.fn(),
}));
jest.mock('@/page/sidebar/components/smart-folder', () => ({
  getSmartFolderSidebarAttrs: jest.fn(),
}));
jest.mock('./Password', () => ({
  Password: ({
    onPassword,
    passwordFailed,
  }: {
    onPassword: (password: string) => void;
    passwordFailed?: boolean;
  }) => (
    <button onClick={() => onPassword('wrong')}>
      {passwordFailed ? 'Incorrect password' : 'Password prompt'}
    </button>
  ),
}));
jest.mock('./ShareLayout', () => ({ ShareLayout: () => null }));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

it.each([500, 401, 403])(
  'localizes the share entry failure and preserves authentication flow (%s)',
  async status => {
    navigate.mockClear();
    jest.mocked(http.get).mockRejectedValue({
      response: { status, data: { message: 'private upstream detail' } },
    });
    const i18n = createInstance();
    await i18n.init({
      lng: 'zh',
      resources: { zh: { translation: zh }, en: { translation: en } },
    });
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () =>
      root.render(
        <I18nextProvider i18n={i18n}>
          <SharePage />
        </I18nextProvider>
      )
    );
    expect(container.textContent).not.toContain('private upstream detail');
    if (status === 401)
      expect(navigate).toHaveBeenCalledWith(
        expect.stringContaining('/user/login?redirect=')
      );
    else if (status === 403)
      expect(container.textContent).toContain('Password prompt');
    else {
      expect(container.textContent).toContain(
        zh.chat.errors.service_unavailable
      );
      await act(async () => {
        await i18n.changeLanguage('en');
      });
      expect(container.textContent).toContain(
        en.chat.errors.service_unavailable
      );
    }
    await act(async () => root.unmount());
  }
);

it('owns a wrong share password inline and localizes other password request errors', async () => {
  jest.mocked(http.get).mockRejectedValue({ response: { status: 403 } });
  const i18n = createInstance();
  await i18n.init({ lng: 'en', resources: { en: { translation: en } } });
  const container = document.createElement('div');
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <I18nextProvider i18n={i18n}>
        <SharePage />
      </I18nextProvider>
    )
  );
  await act(async () => container.querySelector('button')!.click());
  expect(container.textContent).toContain('Incorrect password');
  const config = jest.mocked(http.get).mock.calls.at(-1)?.[1];
  expect(config?.errorContext).toBe('chat');
  expect(config?.muteWhen?.({ response: { status: 403 } } as any)).toBe(true);
  expect(config?.muteWhen?.({ response: { status: 500 } } as any)).toBe(false);
  await act(async () => root.unmount());
});
