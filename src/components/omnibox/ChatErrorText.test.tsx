/** @jest-environment jsdom */
import { createInstance } from 'i18next';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import en from '@/i18n/locales/en.json';
import zh from '@/i18n/locales/zh.json';

import ChatErrorText from './ChatErrorText';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

it('updates a mounted historical error with the UI language and hides unknown details', async () => {
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
        <ChatErrorText error="Software caused connection abort" />
      </I18nextProvider>
    )
  );
  expect(container.textContent).toBe(zh.chat.errors.connection_interrupted);
  await act(async () => {
    await i18n.changeLanguage('en');
  });
  expect(container.textContent).toBe(en.chat.errors.connection_interrupted);
  await act(async () =>
    root.render(
      <I18nextProvider i18n={i18n}>
        <ChatErrorText error="private provider detail" />
      </I18nextProvider>
    )
  );
  expect(container.textContent).toBe(en.chat.errors.unknown);
  await act(async () => root.unmount());
});

it('keeps existing product error copy reactive too', async () => {
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
        <ChatErrorText i18nKey="chat.image.unsupported_format" />
      </I18nextProvider>
    )
  );
  expect(container.textContent).toBe(zh.chat.image.unsupported_format);
  await act(async () => {
    await i18n.changeLanguage('en');
  });
  expect(container.textContent).toBe(en.chat.image.unsupported_format);
  await act(async () => root.unmount());
});
