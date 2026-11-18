/** @jest-environment jsdom */

import { createInstance } from 'i18next';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import en from '@/i18n/locales/en.json';
import zh from '@/i18n/locales/zh.json';

import { TaskTypeBadge } from './TaskTypeBadge';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const i18n = createInstance();
let container: HTMLDivElement;
let root: Root;

async function render() {
  await act(async () => {
    root.render(
      <I18nextProvider i18n={i18n}>
        <TaskTypeBadge functionName="update_memory" />
      </I18nextProvider>
    );
  });
}

beforeAll(async () => {
  await i18n.init({
    lng: 'zh',
    resources: { zh: { translation: zh }, en: { translation: en } },
    interpolation: { escapeValue: false },
  });
});

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

test.each([
  ['zh', '更新记忆'],
  ['en', 'Update Memory'],
])('localizes update_memory in %s', async (language, expected) => {
  await i18n.changeLanguage(language);
  await render();

  expect(container.textContent).toContain(expected);
  expect(container.textContent).not.toContain('update_memory');
});
