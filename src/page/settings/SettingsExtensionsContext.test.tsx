/** @jest-environment jsdom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { SettingsExtensionsContext } from './SettingsExtensionsContext';
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
