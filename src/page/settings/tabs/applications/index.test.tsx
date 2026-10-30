/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import useApplications from '@/hooks/useApplications';
import type { Application } from '@/interface';

import { ApplicationsForm } from '.';
import { beginQrCodeBind } from './beginQrCodeBind';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'zh-CN' },
    t: (key: string) => key,
  }),
}));

jest.mock('react-router-dom', () => ({
  useParams: () => ({ namespace_id: 'namespace-1' }),
}));

jest.mock('@/components/Button', () => ({
  Button: ({ children, ...props }: React.ComponentProps<'button'>) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock('@/components/omnibox/SettingPageButton', () => ({
  SettingPageButton: ({
    children,
    ...props
  }: React.ComponentProps<'button'>) => <button {...props}>{children}</button>,
}));

jest.mock('@/components/tooltip', () => ({
  Tooltip: ({ children }: React.PropsWithChildren) => <>{children}</>,
  TooltipContent: ({ children }: React.PropsWithChildren) => <>{children}</>,
  TooltipTrigger: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('@/components/ui/Separator', () => ({
  Separator: () => <hr />,
}));

jest.mock('@/hooks/useApplications', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockShowToast = jest.fn();

jest.mock('@/page/settings/SettingsToastProvider', () => ({
  useSettingsToast: () => ({ showToast: mockShowToast }),
}));

jest.mock('./beginQrCodeBind', () => ({
  WECHAT_OA_APP_ID: 'wechat_oa_bot',
  beginQrCodeBind: jest.fn(),
  isQrCodeExpired: jest.fn(() => false),
}));

jest.mock('./BindDialog', () => ({ BindDialog: () => null }));
jest.mock('./QRCodeBindDialog', () => ({
  QRCodeBindDialog: ({
    open,
    onOpenChange,
    qrcodeContent,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    qrcodeContent: string;
  }) =>
    open ? (
      <div data-testid="qr-code-dialog">
        {qrcodeContent}
        <button
          type="button"
          aria-label="close-qr-dialog"
          onClick={() => onOpenChange(false)}
        />
      </div>
    ) : null,
}));
jest.mock('./AlreadyBoundDialog', () => ({
  AlreadyBoundDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="already-bound-dialog" /> : null,
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const mockedUseApplications = jest.mocked(useApplications);
const mockedBeginQrCodeBind = jest.mocked(beginQrCodeBind);

function application(partial: Partial<Application> = {}): Application {
  return {
    id: 'application-1',
    namespace_id: 'namespace-1',
    user_id: 'user-1',
    app_id: 'wechat_oa_bot',
    ...partial,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe('ApplicationsForm auto binding', () => {
  let container: HTMLDivElement;
  let root: Root;
  let bindApplication: jest.Mock;
  let unbindApplication: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
    root = createRoot(container);
    bindApplication = jest.fn();
    unbindApplication = jest.fn();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  function mockApplications(applications: Application[]) {
    mockedUseApplications.mockReturnValue({
      applications,
      loading: false,
      error: null,
      bindApplication,
      unbindApplication,
      checkApplicationStatus: jest.fn(),
      refetch: jest.fn(),
    });
  }

  it('opens the QR code dialog before the binding request finishes', async () => {
    const target = application();
    mockApplications([target]);
    const binding = deferred<Awaited<ReturnType<typeof beginQrCodeBind>>>();
    mockedBeginQrCodeBind.mockReturnValue(binding.promise);

    await act(async () => {
      root.render(
        <ApplicationsForm
          autoAction={{ type: 'bind', appId: 'wechat_oa_bot' }}
        />
      );
    });

    expect(mockedBeginQrCodeBind).toHaveBeenCalledWith(
      target,
      bindApplication,
      unbindApplication
    );
    expect(
      container.querySelector('[data-testid="qr-code-dialog"]')?.textContent
    ).toBe('');

    await act(async () => {
      binding.resolve({
        status: 'ready',
        qrcodeContent: 'qr-code-content',
        application: target,
        resumed: false,
      });
      await binding.promise;
    });

    expect(
      container.querySelector('[data-testid="qr-code-dialog"]')?.textContent
    ).toBe('qr-code-content');
  });

  it('shows the already-bound dialog without starting another binding', async () => {
    mockApplications([application({ api_key_id: 'api-key-1' })]);

    await act(async () => {
      root.render(
        <ApplicationsForm
          autoAction={{ type: 'bind', appId: 'wechat_oa_bot' }}
        />
      );
    });

    expect(mockedBeginQrCodeBind).not.toHaveBeenCalled();
    expect(
      container.querySelector('[data-testid="already-bound-dialog"]')
    ).not.toBeNull();
  });

  it('switches from the loading dialog to the already-bound dialog', async () => {
    const target = application();
    mockApplications([target]);
    mockedBeginQrCodeBind.mockResolvedValue({ status: 'already_bound' });

    await act(async () => {
      root.render(
        <ApplicationsForm
          autoAction={{ type: 'bind', appId: 'wechat_oa_bot' }}
        />
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(
      container.querySelector('[data-testid="qr-code-dialog"]')
    ).toBeNull();
    expect(
      container.querySelector('[data-testid="already-bound-dialog"]')
    ).not.toBeNull();
  });

  it('ignores a binding result after the QR code dialog is dismissed', async () => {
    const target = application();
    mockApplications([target]);
    const binding = deferred<Awaited<ReturnType<typeof beginQrCodeBind>>>();
    mockedBeginQrCodeBind.mockReturnValue(binding.promise);

    await act(async () => {
      root.render(
        <ApplicationsForm
          autoAction={{ type: 'bind', appId: 'wechat_oa_bot' }}
        />
      );
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="close-qr-dialog"]')
        ?.click();
    });
    expect(
      container.querySelector('[data-testid="qr-code-dialog"]')
    ).toBeNull();

    await act(async () => {
      binding.resolve({ status: 'already_bound' });
      await binding.promise;
    });

    expect(
      container.querySelector('[data-testid="qr-code-dialog"]')
    ).toBeNull();
    expect(
      container.querySelector('[data-testid="already-bound-dialog"]')
    ).toBeNull();
  });

  it('keeps the new binding loading when a dismissed WECHAT_OA request finishes', async () => {
    const wechatApplication = application();
    const qqApplication = application({
      id: 'application-2',
      app_id: 'qq_bot',
    });
    mockApplications([wechatApplication, qqApplication]);

    const wechatBinding =
      deferred<Awaited<ReturnType<typeof beginQrCodeBind>>>();
    mockedBeginQrCodeBind.mockReturnValue(wechatBinding.promise);
    const qqBinding = deferred<Application>();
    bindApplication.mockReturnValue(qqBinding.promise);

    await act(async () => {
      root.render(
        <ApplicationsForm
          autoAction={{ type: 'bind', appId: 'wechat_oa_bot' }}
        />
      );
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="close-qr-dialog"]')
        ?.click();
    });

    const bindButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button')
    ).filter(button => button.textContent === 'applications.bind.button');
    const qqBindButton = bindButtons[1];

    await act(async () => {
      qqBindButton.click();
    });
    expect(qqBindButton.disabled).toBe(true);

    await act(async () => {
      wechatBinding.resolve({ status: 'already_bound' });
      await wechatBinding.promise;
    });
    expect(qqBindButton.disabled).toBe(true);

    await act(async () => {
      qqBinding.resolve(
        application({
          id: 'application-2',
          app_id: 'qq_bot',
          attrs: { key: 'binding-code' },
        })
      );
      await qqBinding.promise;
    });
    expect(qqBindButton.disabled).toBe(false);
  });

  it('ignores a dismissed WECHAT_OA failure while another binding is loading', async () => {
    const wechatApplication = application();
    const qqApplication = application({
      id: 'application-2',
      app_id: 'qq_bot',
    });
    mockApplications([wechatApplication, qqApplication]);

    const wechatBinding =
      deferred<Awaited<ReturnType<typeof beginQrCodeBind>>>();
    mockedBeginQrCodeBind.mockReturnValue(wechatBinding.promise);
    const qqBinding = deferred<Application>();
    bindApplication.mockReturnValue(qqBinding.promise);

    await act(async () => {
      root.render(
        <ApplicationsForm
          autoAction={{ type: 'bind', appId: 'wechat_oa_bot' }}
        />
      );
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="close-qr-dialog"]')
        ?.click();
    });

    const qqBindButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button')
    ).filter(button => button.textContent === 'applications.bind.button')[1];

    await act(async () => {
      qqBindButton.click();
    });

    await act(async () => {
      wechatBinding.reject(new Error('binding failed'));
      await expect(wechatBinding.promise).rejects.toThrow('binding failed');
    });
    expect(qqBindButton.disabled).toBe(true);
    expect(mockShowToast).not.toHaveBeenCalledWith(
      'applications.bind.error',
      'error'
    );

    await act(async () => {
      qqBinding.resolve(
        application({
          id: 'application-2',
          app_id: 'qq_bot',
          attrs: { key: 'binding-code' },
        })
      );
      await qqBinding.promise;
    });
    expect(qqBindButton.disabled).toBe(false);
  });

  it('closes the loading dialog and shows an error when binding fails', async () => {
    const target = application();
    mockApplications([target]);
    mockedBeginQrCodeBind.mockRejectedValue(new Error('binding failed'));

    await act(async () => {
      root.render(
        <ApplicationsForm
          autoAction={{ type: 'bind', appId: 'wechat_oa_bot' }}
        />
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(
      container.querySelector('[data-testid="qr-code-dialog"]')
    ).toBeNull();
    expect(mockShowToast).toHaveBeenCalledWith(
      'applications.bind.error',
      'error'
    );
  });
});
