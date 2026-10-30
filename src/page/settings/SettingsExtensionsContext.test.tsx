/** @jest-environment jsdom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { SettingsExtensionsContext } from './settingsExtensionsContext';
import { SettingsSidebar } from './SettingsSidebar';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/hooks/useConfig', () => ({
  __esModule: true,
  default: () => ({ config: {} }),
}));
jest.mock('@/assets/logo.svg', () => 'logo');
jest.mock('@/page/sidebar/components/namespace-switcher/UpgradeButton', () => ({
  UpgradeButton: () => null,
}));

it('only renders registered settings and namespaces extension IDs', async () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  const root = createRoot(container);
  const onChange = jest.fn();
  const sidebar = (
    <SettingsSidebar value="profile" onChange={onChange} username="User" />
  );
  await act(async () => root.render(sidebar));
  expect(container.textContent).not.toContain('Local sync');
  expect(container.textContent).not.toContain('setting.feature_previews');
  await act(async () =>
    root.render(
      <SettingsExtensionsContext.Provider
        value={[
          {
            id: 'sync',
            label: 'Local sync',
            icon: null,
            component: () => null,
          },
        ]}
      >
        {sidebar}
      </SettingsExtensionsContext.Provider>
    )
  );
  const button = Array.from(container.querySelectorAll('button')).find(
    item => item.textContent === 'Local sync'
  );
  expect(button).toBeDefined();
  await act(async () => button!.click());
  expect(onChange).toHaveBeenCalledWith('extension:sync');
  await act(async () => root.unmount());
});

it.each<{
  group?: 'account' | 'space';
  section: string;
}>([
  { section: 'setting.account' },
  { group: 'account', section: 'setting.account' },
  { group: 'space', section: 'setting.space' },
])('places a $group extension in $section', async ({ group, section }) => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  const root = createRoot(container);
  const onChange = jest.fn();
  const extensions = [
    {
      id: 'runtime',
      label: 'Local execution',
      icon: null,
      component: () => null,
    },
    {
      id: 'localSync',
      label: 'Local sync',
      icon: null,
      component: () => null,
      group,
    },
  ];
  const getSection = (label: string) => {
    const heading = Array.from(container.querySelectorAll('span')).find(
      element => element.textContent === label
    );
    expect(heading).toBeDefined();
    return heading!.parentElement!.parentElement!;
  };

  try {
    await act(async () =>
      root.render(
        <SettingsExtensionsContext.Provider value={extensions}>
          <SettingsSidebar
            value="extension:localSync"
            onChange={onChange}
            username="User"
          />
        </SettingsExtensionsContext.Provider>
      )
    );
    const buttons = Array.from(container.querySelectorAll('button')).filter(
      button => button.textContent === 'Local sync'
    );
    expect(buttons).toHaveLength(1);
    expect(getSection(section).contains(buttons[0])).toBe(true);
    const otherSection =
      section === 'setting.account' ? 'setting.space' : 'setting.account';
    expect(getSection(otherSection).contains(buttons[0])).toBe(false);
    expect(getSection('setting.account').textContent).toContain(
      'Local execution'
    );
    expect(buttons[0].getAttribute('aria-current')).toBe('page');
    expect(
      container.querySelectorAll('button[aria-current="page"]')
    ).toHaveLength(1);
    await act(async () => buttons[0].click());
    expect(onChange).toHaveBeenCalledWith('extension:localSync');
  } finally {
    await act(async () => root.unmount());
  }
});
