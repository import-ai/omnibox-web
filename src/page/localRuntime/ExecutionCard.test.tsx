/** @jest-environment jsdom */
import { createInstance } from 'i18next';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import en from '@/i18n/locales/en.json';
import zh from '@/i18n/locales/zh.json';

import ExecutionCard from './ExecutionCard';
import { type LocalExecution, runtimeApi } from './runtime';

jest.mock('./runtime', () => ({
  terminal: new Set(['failed']),
  runtimeApi: { events: jest.fn(), cancel: jest.fn() },
  mergeEvents: (_old: unknown, incoming: unknown) => incoming,
  useCurrentDeviceId: () => null,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

it('localizes status failures and request errors while preserving raw command output', async () => {
  const i18n = createInstance();
  await i18n.init({
    lng: 'zh',
    resources: { zh: { translation: zh }, en: { translation: en } },
  });
  jest.mocked(runtimeApi.events).mockResolvedValue([
    { sequence: 1, kind: 'stderr', data: 'raw command error' },
    { sequence: 2, kind: 'status', data: 'Software caused connection abort' },
  ]);
  const container = document.createElement('div');
  const root = createRoot(container);
  const execution = {
    id: 'e',
    status: 'failed',
    created_at: '2026-10-30T00:00:00Z',
    exit_code: 1,
    approvals: [],
    command: 'test',
    cwd: '/',
    timeout_seconds: 30,
  } as unknown as LocalExecution;
  await act(async () =>
    root.render(
      <I18nextProvider i18n={i18n}>
        <ExecutionCard
          execution={execution}
          deviceName="Device"
          refresh={() => {}}
        />
      </I18nextProvider>
    )
  );
  const toggle = container.querySelector('button')!;
  await act(async () => toggle.click());
  expect(container.textContent).toContain(
    zh.chat.errors.connection_interrupted
  );
  expect(container.textContent).toContain('raw command error');
  expect(container.textContent).not.toContain(
    'Software caused connection abort'
  );
  await act(async () => {
    await i18n.changeLanguage('en');
  });
  expect(container.textContent).toContain(
    en.chat.errors.connection_interrupted
  );
  expect(container.textContent).toContain('raw command error');
  await act(async () => root.unmount());
});

it('keeps caught API errors local to the card and translates them on language changes', async () => {
  const i18n = createInstance();
  await i18n.init({
    lng: 'zh',
    resources: { zh: { translation: zh }, en: { translation: en } },
  });
  jest.mocked(runtimeApi.events).mockRejectedValue({
    response: {
      status: 409,
      data: {
        code: 'LOCAL_RUNTIME_OFFLINE',
        message: 'private internal detail',
      },
    },
  });
  const container = document.createElement('div');
  const root = createRoot(container);
  const execution = {
    id: 'e',
    status: 'failed',
    created_at: '2026-10-30T00:00:00Z',
    exit_code: 1,
    approvals: [],
    command: 'test',
    cwd: '/',
    timeout_seconds: 30,
  } as unknown as LocalExecution;
  await act(async () =>
    root.render(
      <I18nextProvider i18n={i18n}>
        <ExecutionCard
          execution={execution}
          deviceName="Device"
          refresh={() => {}}
        />
      </I18nextProvider>
    )
  );
  await act(async () => container.querySelector('button')!.click());
  expect(container.querySelector('[role="alert"]')?.textContent).toBe(
    zh.chat.errors.device_offline
  );
  expect(container.textContent).not.toContain('private internal detail');
  await act(async () => {
    await i18n.changeLanguage('en');
  });
  expect(container.querySelector('[role="alert"]')?.textContent).toBe(
    en.chat.errors.device_offline
  );
  await act(async () => root.unmount());
});
