/** @jest-environment jsdom */

import i18next from 'i18next';
import { act, type ComponentProps, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import zh from '@/i18n/locales/zh.json';
import type { Application } from '@/interface';
import { http } from '@/lib/request';
import { useSettingsToast } from '@/page/settings/SettingsToastProvider';

import { ApplicationsForm } from './index';

jest.mock('@/const', () => ({ BIND_CHECK_INTERVAL: 3000 }));
jest.mock('@/lib/request', () => ({
  http: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (...args: unknown[]) => require('i18next').t(...args),
    i18n: { language: 'zh' },
  }),
}));
let namespaceId = 'space-1';
jest.mock('react-router-dom', () => ({
  useParams: () => ({ namespace_id: namespaceId }),
}));
jest.mock('@/page/settings/SettingsToastProvider', () => ({
  useSettingsToast: jest.fn(),
}));
jest.mock('@/lib/getDocsLink.ts', () => ({ getDocsLink: () => '/docs' }));
jest.mock('@/lib/utils', () => ({ cn: () => '' }));
jest.mock('lucide-react', () => ({ CircleHelp: () => null }));
jest.mock('@/components/omnibox/IconButton', () => ({
  sidebarToolbarIconButtonClassName: '',
}));
jest.mock('@/components/Button', () => ({
  Button: ({ children, ...props }: ComponentProps<'button'>) => (
    <button {...props}>{children}</button>
  ),
}));
jest.mock('@/components/omnibox/SettingPageButton', () => ({
  SettingPageButton: ({
    children,
    disabled,
    onClick,
  }: ComponentProps<'button'>) => (
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));
jest.mock('@/components/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => children,
  TooltipTrigger: ({ children }: { children: ReactNode }) => children,
  TooltipContent: () => null,
}));
jest.mock('@/components/ui/Separator', () => ({ Separator: () => null }));
jest.mock('@/components/ui/Spinner', () => ({
  Spinner: () => <span role="status" />,
}));
jest.mock('@/components/ui/alert-dialog', () => {
  const Content = ({ children }: { children: ReactNode }) => children;
  return {
    AlertDialog: ({
      open,
      children,
    }: {
      open: boolean;
      children: ReactNode;
    }) => (open ? <div role="alertdialog">{children}</div> : null),
    AlertDialogAction: ({
      children,
      disabled,
      onClick,
    }: ComponentProps<'button'>) => (
      <button disabled={disabled} onClick={onClick}>
        {children}
      </button>
    ),
    AlertDialogCancel: Content,
    AlertDialogContent: Content,
    AlertDialogDescription: Content,
    AlertDialogFooter: Content,
    AlertDialogHeader: Content,
    AlertDialogTitle: Content,
  };
});
jest.mock('./BindDialog', () => ({ BindDialog: () => null }));
jest.mock('./QRCodeBindDialog', () => ({ QRCodeBindDialog: () => null }));
jest.mock('./AlreadyBoundDialog', () => ({ AlreadyBoundDialog: () => null }));

const bound = {
  app_id: 'wechat_oa_bot',
  id: 'binding-1',
  api_key_id: 'key-1',
} as Application;
const unbound = { app_id: 'wechat_oa_bot' } as Application;
const missingBinding = {
  isAxiosError: true,
  response: { status: 404, data: { code: 'app_authorization_not_found' } },
};

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('ApplicationsForm unbinding synchronization', () => {
  let root: Root;
  let container: HTMLDivElement;
  const showToast = jest.fn();

  async function click(label: string) {
    const button = Array.from(container.querySelectorAll('button')).find(
      item => item.textContent === label
    );
    expect(button).toBeDefined();
    await act(async () => button!.click());
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    void i18next.init({
      lng: 'zh',
      resources: { zh: { translation: zh } },
      initImmediate: false,
      showSupportNotice: false,
    });
    namespaceId = 'space-1';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    jest.mocked(useSettingsToast).mockReturnValue({ showToast });
    jest.mocked(http.get).mockResolvedValue([bound]);
    jest.mocked(http.delete).mockResolvedValue(undefined);
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    jest.useRealTimers();
  });

  it('updates the row, closes a stale confirmation, and notifies exactly once', async () => {
    await act(async () => root.render(<ApplicationsForm />));
    expect(container.textContent).toContain('微信 AI 对话助手');
    await click('解绑');
    expect(container.querySelector('[role="alertdialog"]')).not.toBeNull();
    jest.mocked(http.get).mockResolvedValue([unbound]);

    await act(async () => jest.advanceTimersByTime(3000));
    await act(async () => jest.advanceTimersByTime(6000));

    expect(container.textContent).toContain('未绑定');
    expect(container.textContent).toContain('绑定');
    expect(container.textContent).not.toContain('解绑');
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
    expect(http.delete).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith('解绑成功', 'success');
  });

  it('recovers an already removed binding before the first poll', async () => {
    await act(async () => root.render(<ApplicationsForm />));
    await click('解绑');
    jest.mocked(http.delete).mockRejectedValueOnce(missingBinding);
    jest.mocked(http.get).mockResolvedValue([unbound]);

    await click('确认解绑');

    expect(container.textContent).toContain('未绑定');
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith('解绑成功', 'success');
  });

  it('preserves the existing success message for normal local unbinding', async () => {
    await act(async () => root.render(<ApplicationsForm />));
    await click('解绑');
    jest.mocked(http.get).mockResolvedValue([unbound]);
    await click('确认解绑');
    await act(async () => jest.advanceTimersByTime(6000));

    expect(container.textContent).toContain('未绑定');
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith('助手解绑成功', 'success');
  });

  it.each([
    ['network error', new Error('offline')],
    ['permission error', { response: { status: 403 } }],
    [
      'server error with a misleading code',
      {
        isAxiosError: true,
        response: {
          status: 500,
          data: { code: 'app_authorization_not_found' },
        },
      },
    ],
    [
      'unrelated not-found error',
      { response: { status: 404, data: { code: 'APP_NOT_FOUND' } } },
    ],
  ])('keeps real %s feedback', async (_label, error) => {
    await act(async () => root.render(<ApplicationsForm />));
    await click('解绑');
    jest.mocked(http.delete).mockRejectedValueOnce(error);
    await click('确认解绑');

    expect(container.textContent).toContain('已绑定');
    expect(showToast).toHaveBeenCalledWith('助手解绑失败', 'error');
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('does not claim success or delete a newly created binding', async () => {
    const rebound = { ...bound, id: 'binding-2', api_key_id: 'key-2' };
    await act(async () => root.render(<ApplicationsForm />));
    await click('解绑');
    jest.mocked(http.delete).mockRejectedValueOnce(missingBinding);
    jest.mocked(http.get).mockResolvedValue([rebound]);
    await click('确认解绑');

    expect(container.textContent).toContain('已绑定');
    expect(showToast).not.toHaveBeenCalledWith('解绑成功', 'success');
    expect(http.delete).toHaveBeenCalledTimes(1);
    expect(http.delete).toHaveBeenCalledWith(
      '/namespaces/space-1/applications/binding-1',
      { mute: true }
    );
  });

  it('does not claim success when verification fails', async () => {
    await act(async () => root.render(<ApplicationsForm />));
    await click('解绑');
    jest.mocked(http.delete).mockRejectedValueOnce(missingBinding);
    jest.mocked(http.get).mockRejectedValueOnce(new Error('offline'));
    await click('确认解绑');

    expect(container.textContent).toContain('已绑定');
    expect(showToast).toHaveBeenCalledWith('助手解绑失败', 'error');
  });

  it('does not report success when the refreshed response omits the application', async () => {
    await act(async () => root.render(<ApplicationsForm />));
    await click('解绑');
    jest.mocked(http.delete).mockRejectedValueOnce(missingBinding);
    jest.mocked(http.get).mockResolvedValue([]);
    await click('确认解绑');

    expect(showToast).toHaveBeenCalledWith('助手解绑失败', 'error');
    expect(showToast).not.toHaveBeenCalledWith('解绑成功', 'success');
  });

  it('ignores completion of an unbind from the previous namespace', async () => {
    let finishDelete!: () => void;
    const deletion = new Promise<void>(resolve => {
      finishDelete = resolve;
    });
    await act(async () => root.render(<ApplicationsForm />));
    await click('解绑');
    jest.mocked(http.delete).mockReturnValueOnce(deletion);
    await click('确认解绑');

    namespaceId = 'space-2';
    jest.mocked(http.get).mockResolvedValue([unbound]);
    await act(async () => root.render(<ApplicationsForm />));
    await act(async () => finishDelete());

    expect(container.textContent).toContain('未绑定');
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
    expect(showToast).not.toHaveBeenCalled();
    expect(http.get).toHaveBeenCalledTimes(2);
  });

  it('does not show a toast when a background response arrives after hiding the page', async () => {
    await act(async () => root.render(<ApplicationsForm />));
    let resolvePoll!: (value: Application[]) => void;
    const poll = new Promise<Application[]>(resolve => {
      resolvePoll = resolve;
    });
    jest.mocked(http.get).mockReturnValueOnce(poll);
    await act(async () => jest.advanceTimersByTime(3000));
    Object.defineProperty(document, 'visibilityState', { value: 'hidden' });
    await act(async () =>
      document.dispatchEvent(new Event('visibilitychange'))
    );
    await act(async () => resolvePoll([unbound]));

    expect(showToast).not.toHaveBeenCalled();
  });

  it('ignores remote unbinding during the settings close animation and reopens without a historical toast', async () => {
    await act(async () => root.render(<ApplicationsForm />));
    let resolvePoll!: (value: Application[]) => void;
    const poll = new Promise<Application[]>(resolve => {
      resolvePoll = resolve;
    });
    jest.mocked(http.get).mockReturnValueOnce(poll);
    await act(async () => jest.advanceTimersByTime(3000));
    await act(async () => root.render(<ApplicationsForm active={false} />));
    await act(async () => resolvePoll([unbound]));
    expect(showToast).not.toHaveBeenCalled();

    jest.mocked(http.get).mockResolvedValue([unbound]);
    await act(async () => root.render(<ApplicationsForm />));
    expect(container.textContent).toContain('未绑定');
    expect(showToast).not.toHaveBeenCalled();
  });

  it('ignores a local unbind finishing after settings close and reopen', async () => {
    await act(async () => root.render(<ApplicationsForm />));
    await click('解绑');
    let finishDelete!: () => void;
    const deletion = new Promise<void>(resolve => {
      finishDelete = resolve;
    });
    jest.mocked(http.delete).mockReturnValueOnce(deletion);
    await click('确认解绑');
    await act(async () => root.render(<ApplicationsForm active={false} />));
    jest.mocked(http.get).mockResolvedValue([unbound]);
    await act(async () => root.render(<ApplicationsForm />));
    await act(async () => finishDelete());

    expect(container.textContent).toContain('未绑定');
    expect(showToast).not.toHaveBeenCalled();
  });
  describe.each(['wechat_bot', 'qq_bot', 'wechat_clawbot', 'telegram_bot'])(
    '%s synchronization',
    appId => {
      const existing = { ...bound, app_id: appId };
      const removed = { app_id: appId };
      it('updates the row and shows the generic remote success once', async () => {
        jest.mocked(http.get).mockResolvedValueOnce([existing]);
        await act(async () => root.render(<ApplicationsForm />));
        jest.mocked(http.get).mockResolvedValue([removed]);
        await act(async () => jest.advanceTimersByTime(3000));
        await act(async () => jest.advanceTimersByTime(6000));
        expect(container.textContent).toContain('未绑定');
        expect(showToast).toHaveBeenCalledTimes(1);
        expect(showToast).toHaveBeenCalledWith('解绑成功', 'success');
      });
      it('recovers duplicate unbinding after server verification', async () => {
        jest.mocked(http.get).mockResolvedValueOnce([existing]);
        await act(async () => root.render(<ApplicationsForm />));
        await click('解绑');
        jest.mocked(http.delete).mockRejectedValueOnce(missingBinding);
        jest.mocked(http.get).mockResolvedValue([removed]);
        await click('确认解绑');
        expect(container.textContent).toContain('未绑定');
        expect(showToast).toHaveBeenCalledTimes(1);
        expect(showToast).toHaveBeenCalledWith('解绑成功', 'success');
      });
      it.each(['pending', 'bound'])(
        'preserves a replacement %s binding',
        async state => {
          jest.mocked(http.get).mockResolvedValueOnce([existing]);
          await act(async () => root.render(<ApplicationsForm />));
          await click('解绑');
          jest.mocked(http.delete).mockRejectedValueOnce(missingBinding);
          const replacement = {
            ...existing,
            id: 'new-binding',
            api_key_id: state === 'bound' ? 'new-key' : undefined,
            attrs: state === 'pending' ? { key: 'new-code' } : {},
          };
          jest.mocked(http.get).mockResolvedValue([replacement]);
          await click('确认解绑');
          expect(http.delete).toHaveBeenCalledTimes(1);
          expect(container.querySelector('[role="alertdialog"]')).toBeNull();
          expect(showToast).not.toHaveBeenCalledWith('解绑成功', 'success');
          expect(showToast).not.toHaveBeenCalledWith('助手解绑失败', 'error');
          expect(showToast).toHaveBeenCalledWith(
            '绑定状态已更新，请确认后重新操作。',
            'success'
          );
        }
      );
      it.each([new Error('offline'), { response: { status: 403 } }])(
        'preserves real failures: %j',
        async error => {
          jest.mocked(http.get).mockResolvedValueOnce([existing]);
          await act(async () => root.render(<ApplicationsForm />));
          await click('解绑');
          jest.mocked(http.delete).mockRejectedValueOnce(error);
          await click('确认解绑');
          expect(container.textContent).toContain('已绑定');
          expect(showToast).toHaveBeenCalledWith('助手解绑失败', 'error');
        }
      );
    }
  );

  it('groups simultaneous remote removals and allows a new binding to notify later', async () => {
    const qq = { ...bound, id: 'qq-1', app_id: 'qq_bot' };
    jest.mocked(http.get).mockResolvedValueOnce([bound, qq]);
    await act(async () => root.render(<ApplicationsForm />));
    jest.mocked(http.get).mockResolvedValue([unbound, { app_id: 'qq_bot' }]);
    await act(async () => jest.advanceTimersByTime(3000));
    expect(showToast).toHaveBeenCalledTimes(1);
    jest.mocked(http.get).mockResolvedValue([{ ...qq, id: 'qq-2' }, unbound]);
    await act(async () => window.dispatchEvent(new Event('focus')));
    jest.mocked(http.get).mockResolvedValue([unbound, { app_id: 'qq_bot' }]);
    await act(async () => jest.advanceTimersByTime(3000));
    expect(showToast).toHaveBeenCalledTimes(2);
  });
  it('does not display an old account’s successful unbind in the new account session', async () => {
    localStorage.setItem('uid', 'account-before');
    await act(async () => root.render(<ApplicationsForm />));
    await click('解绑');
    let resolve!: () => void;
    const pending = new Promise<void>(done => {
      resolve = done;
    });
    jest.mocked(http.delete).mockReturnValueOnce(pending);
    await click('确认解绑');
    jest.mocked(http.get).mockResolvedValue([unbound]);
    await act(async () => {
      localStorage.setItem('uid', 'account-after');
      window.dispatchEvent(new Event('omnibox:credential-changed'));
    });
    await act(async () => {
      resolve();
      await pending;
    });
    expect(showToast).not.toHaveBeenCalled();
    expect(container.textContent).toContain('未绑定');
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
    await act(async () => {
      localStorage.removeItem('uid');
      window.dispatchEvent(new Event('omnibox:credential-changed'));
    });
  });
});
