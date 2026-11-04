/** @jest-environment jsdom */

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import useApp from '@/hooks/useApp';
import { http } from '@/lib/request';

import Setting from './index';

jest.mock('@/hooks/useApp', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/hooks/useConfig', () => ({
  __esModule: true,
  default: () => ({ config: {} }),
}));
jest.mock('@/hooks/useUser', () => ({
  __esModule: true,
  default: () => ({ user: {} }),
}));
jest.mock('@/lib/request', () => ({ http: { get: jest.fn() } }));
jest.mock('react-router-dom', () => ({
  useParams: () => ({ namespace_id: 'space-1' }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('radix-ui', () => ({
  VisuallyHidden: { Root: ({ children }: { children: ReactNode }) => children },
}));
jest.mock('@/components/omnibox/Dialog', () => {
  const RetainedContent = ({ children }: { children: ReactNode }) => children;
  return {
    // Keep children mounted to model the dialog's closing animation.
    Dialog: RetainedContent,
    DialogContent: RetainedContent,
    DialogDescription: RetainedContent,
    DialogHeader: RetainedContent,
    DialogTitle: RetainedContent,
  };
});
jest.mock('@/components/ui/Separator', () => ({ Separator: () => null }));
jest.mock('@/page/settings/tabs/contact', () => ({
  __esModule: true,
  default: () => <output>Contact content</output>,
}));
jest.mock('@/page/settings/SettingsToastProvider', () => ({
  SettingsToastProvider: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('@/page/settings/SettingsSidebar', () => ({
  SettingsSidebar: ({ onChange }: { onChange: (tab: string) => void }) => (
    <>
      <button onClick={() => onChange('profile')}>Profile</button>
      <button onClick={() => onChange('contact')}>Contact</button>
      <button onClick={() => onChange('applications')}>Applications</button>
    </>
  ),
}));
jest.mock('@/page/settings/tabs/applications', () => ({
  ApplicationsForm: ({ active }: { active: boolean }) => (
    <output data-active={String(active)}>Applications content</output>
  ),
}));
jest.mock('@/page/localRuntime/DeviceSettings', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/page/people', () => ({ __esModule: true, default: () => null }));
jest.mock('@/page/settings/tabs/members/tasks', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/page/settings/tabs/about', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/page/settings/tabs/account/APIKeyForm', () => ({
  APIKeyForm: () => null,
}));
jest.mock('@/page/settings/tabs/account/AutoRenewalSection', () => ({
  AutoRenewalSection: () => null,
}));
jest.mock('@/page/settings/tabs/account/SettingForm', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/page/settings/tabs/basic', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/page/settings/tabs/content', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/page/settings/tabs/featurePreviews', () => ({
  FeaturePreviewsForm: () => null,
}));
jest.mock('@/page/settings/tabs/profile', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/page/settings/tabs/quota', () => ({ RemainQuota: () => null }));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('settings binding page lifecycle', () => {
  let root: Root;
  let container: HTMLDivElement;
  let openSettings: (payload: { tab: string }) => void;

  beforeEach(async () => {
    jest.clearAllMocks();
    const app = {
      on: jest.fn((_event, callback) => {
        openSettings = callback;
        return () => undefined;
      }),
      fire: jest.fn(),
    };
    jest
      .mocked(useApp)
      .mockReturnValue(app as unknown as ReturnType<typeof useApp>);
    jest.mocked(http.get).mockResolvedValue({ role: 'member' });
    container = document.createElement('div');
    root = createRoot(container);
    await act(async () => root.render(<Setting />));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  async function click(label: string) {
    const button = Array.from(container.querySelectorAll('button')).find(
      element => element.textContent === label
    );
    expect(button).toBeDefined();
    await act(async () => button!.click());
  }

  it('deactivates the binding page as soon as settings close, before dialog unmount', async () => {
    await act(async () => openSettings({ tab: 'applications' }));
    expect(container.querySelector('output')?.dataset.active).toBe('true');

    await click('Close');

    expect(container.querySelector('output')).not.toBeNull();
    expect(container.querySelector('output')?.dataset.active).toBe('false');
    await act(async () => openSettings({ tab: 'applications' }));
    expect(container.querySelector('output')?.dataset.active).toBe('true');
  });

  it('unmounts the binding page when another settings tab is selected', async () => {
    await act(async () => openSettings({ tab: 'applications' }));
    await click('Profile');
    expect(container.querySelector('output')).toBeNull();

    await click('Applications');
    expect(container.querySelector('output')?.dataset.active).toBe('true');
  });
  it('opens contact from the event and allows switching back to contact in the same dialog', async () => {
    await act(async () => openSettings({ tab: 'contact' }));
    expect(container.textContent).toContain('Contact content');
    const profile = [...container.querySelectorAll('button')].find(
      button => button.textContent === 'Profile'
    )!;
    await act(async () => profile.click());
    expect(container.textContent).not.toContain('Contact content');
    const contact = [...container.querySelectorAll('button')].find(
      button => button.textContent === 'Contact'
    )!;
    await act(async () => contact.click());
    expect(container.textContent).toContain('Contact content');
  });
});
