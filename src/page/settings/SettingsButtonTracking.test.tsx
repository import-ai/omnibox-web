/** @jest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import type { Application } from '@/interface';
import { track } from '@/lib/sendTrackEvent';
import { SettingsSidebar } from '@/page/settings/SettingsSidebar';
import { ApplicationsForm } from '@/page/settings/tabs/applications';

jest.unmock('@/lib/trackButtonClick');
jest.mock('@/assets/logo.svg', () => 'logo');
jest.mock('@/lib/sendTrackEvent', () => ({ track: jest.fn() }));
jest.mock('@/lib/request', () => ({ http: {} }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh-CN' },
  }),
}));
jest.mock('react-router-dom', () => ({
  useParams: () => ({ namespace_id: 'ns' }),
}));
jest.mock('@/hooks/useConfig', () => ({
  __esModule: true,
  default: () => ({ config: { commercial: false } }),
}));
jest.mock('@/hooks/useApplicationIdentity', () => ({
  useApplicationIdentity: () => 'user',
}));
jest.mock('@/components/tooltip', () => ({
  Tooltip: ({ children }: React.PropsWithChildren) => children,
  TooltipTrigger: ({ children }: React.PropsWithChildren) => children,
  TooltipContent: () => null,
}));
jest.mock('@/page/sidebar/components/namespace-switcher/UpgradeButton', () => ({
  UpgradeButton: () => null,
}));
jest.mock('@/page/settings/SettingsToastProvider', () => ({
  useSettingsToast: () => ({ showToast: jest.fn() }),
}));
const applications: Application[] = [
  {
    id: 'wechat',
    namespace_id: 'ns',
    user_id: 'user',
    app_id: 'wechat_bot',
    api_key_id: 'key1',
  },
  {
    id: 'telegram',
    namespace_id: 'ns',
    user_id: 'user',
    app_id: 'telegram_bot',
    api_key_id: 'key2',
  },
];
const appState = {
  applications,
  loading: false,
  bindApplication: jest.fn(),
  unbindApplication: jest.fn(),
  checkApplicationStatus: jest.fn(),
  refetch: jest.fn(),
};
jest.mock('@/hooks/useApplications', () => ({
  __esModule: true,
  default: () => appState,
}));
jest.mock('@/page/settings/tabs/applications/BindDialog', () => ({
  BindDialog: () => null,
}));
jest.mock('@/page/settings/tabs/applications/QRCodeBindDialog', () => ({
  QRCodeBindDialog: () => null,
}));
jest.mock('@/page/settings/tabs/applications/AlreadyBoundDialog', () => ({
  AlreadyBoundDialog: () => null,
}));
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  appState.applications = applications;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
async function clickText(label: string, from: ParentNode = document) {
  const button = Array.from(from.querySelectorAll('button')).find(
    x => x.textContent === label
  );
  if (!button) throw new Error(label);
  await act(async () => button.click());
}
it('identifies each settings destination in outgoing events', async () => {
  const onChange = jest.fn();
  await act(async () =>
    root.render(
      <SettingsSidebar value="profile" username="User" onChange={onChange} />
    )
  );
  await clickText('setting.preferences');
  await clickText('setting.applications');
  expect(onChange.mock.calls.map(x => x[0])).toEqual(['basic', 'applications']);
  expect(jest.mocked(track).mock.calls).toEqual([
    ['button_click', { name: 'settings_section_select', section: 'basic' }],
    [
      'button_click',
      { name: 'settings_section_select', section: 'applications' },
    ],
  ]);
});
it('identifies the assistant and action for unbind and cancellation', async () => {
  await act(async () => root.render(<ApplicationsForm />));
  const buttons = Array.from(host.querySelectorAll('button')).filter(
    x => x.textContent === 'applications.unbind.button'
  );
  expect(buttons).toHaveLength(2);
  await act(async () => buttons[0].click());
  expect(jest.mocked(track).mock.calls[0]).toEqual([
    'button_click',
    {
      variant: 'outline',
      size: 'sm',
      name: 'settings_binding_remove',
      app_id: 'wechat_bot',
      action: 'unbind',
    },
  ]);
  await clickText('cancel', document.querySelector('[role="alertdialog"]')!);
  expect(jest.mocked(track).mock.calls[1]).toEqual([
    'button_click',
    {
      variant: 'outline',
      name: 'settings_binding_cancel',
      app_id: 'wechat_bot',
      action: 'unbind',
    },
  ]);
  jest.mocked(track).mockClear();
  await act(async () => buttons[1].click());
  expect(jest.mocked(track).mock.calls[0]).toEqual([
    'button_click',
    {
      variant: 'outline',
      size: 'sm',
      name: 'settings_binding_remove',
      app_id: 'telegram_bot',
      action: 'unbind',
    },
  ]);
});

it('distinguishes cancelling a pending bind from unbinding an assistant', async () => {
  appState.applications = [
    { ...applications[0], api_key_id: undefined, attrs: { key: 'pending' } },
  ];
  await act(async () => root.render(<ApplicationsForm />));
  await clickText('applications.bind.cancel_button');
  await clickText('applications.bind.cancel.confirm.button');
  expect(jest.mocked(track).mock.calls).toEqual([
    [
      'button_click',
      {
        name: 'settings_binding_cancel',
        variant: 'outline',
        size: 'sm',
        app_id: 'wechat_bot',
        action: 'cancel_bind',
      },
    ],
    [
      'button_click',
      {
        name: 'settings_binding_confirm',
        app_id: 'wechat_bot',
        action: 'cancel_bind',
      },
    ],
  ]);
  expect(appState.unbindApplication).toHaveBeenCalledWith('wechat');
});
