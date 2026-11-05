/** @jest-environment jsdom */

import { createInstance } from 'i18next';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import en from '@/i18n/locales/en.json';
import zh from '@/i18n/locales/zh.json';

import {
  AgreementCheckbox,
  AgreementConsentProvider,
  useAgreementConsent,
} from './AgreementConsent';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const first = jest.fn();
const second = jest.fn();
function Actions() {
  const { runWithConsent } = useAgreementConsent();
  return (
    <>
      <AgreementCheckbox />
      <button onClick={() => runWithConsent(first)}>First</button>
      <button onClick={() => runWithConsent(second)}>Second</button>
    </>
  );
}

let root: Root;
let container: HTMLDivElement;
const i18n = createInstance();
const checkbox = () => container.querySelector('[role="checkbox"]')!;
const dialog = () => document.querySelector('[role="dialog"]');
const button = (text: string) =>
  [...document.querySelectorAll('button')].find(
    node => node.textContent === text
  )!;
async function click(node: Element) {
  await act(async () => (node as HTMLElement).click());
}
async function render(scopeKey = 'phone', key = 'login') {
  await act(async () =>
    root.render(
      <I18nextProvider i18n={i18n}>
        <AgreementConsentProvider key={key} scopeKey={scopeKey}>
          <Actions />
        </AgreementConsentProvider>
      </I18nextProvider>
    )
  );
}

beforeAll(async () => {
  await i18n.init({
    lng: 'zh',
    resources: { zh: { translation: zh }, en: { translation: en } },
    interpolation: { escapeValue: false },
  });
});
beforeEach(async () => {
  first.mockReset();
  second.mockReset();
  await i18n.changeLanguage('zh');
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await render();
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

it('starts unchecked and confirms the original action exactly once', async () => {
  expect(checkbox().getAttribute('aria-checked')).toBe('false');
  await click(button('First'));
  expect(first).not.toHaveBeenCalled();
  expect(dialog()?.textContent).toContain('服务协议和隐私政策等指引');
  const confirm = button('同意并继续');
  await act(async () => {
    confirm.click();
    confirm.click();
  });
  expect(first).toHaveBeenCalledTimes(1);
  expect(second).not.toHaveBeenCalled();
  expect(checkbox().getAttribute('aria-checked')).toBe('true');
  expect(dialog()).toBeNull();
});
it('declines without running or accepting, then resumes a newly selected action', async () => {
  await click(button('First'));
  await click(button('不同意'));
  expect(first).not.toHaveBeenCalled();
  expect(dialog()).toBeNull();
  expect(checkbox().getAttribute('aria-checked')).toBe('false');
  await click(button('Second'));
  await click(button('同意并继续'));
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledTimes(1);
});
it('dismisses with Escape and drops the old action', async () => {
  await click(button('First'));
  await act(async () =>
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    )
  );
  expect(dialog()).toBeNull();
  expect(first).not.toHaveBeenCalled();
  expect(checkbox().getAttribute('aria-checked')).toBe('false');
  await click(button('Second'));
  await click(button('同意并继续'));
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledTimes(1);
});
it('does not replace a pending operation with repeated requests', async () => {
  await act(async () => {
    button('First').click();
    button('Second').click();
  });
  await click(button('同意并继续'));
  expect(first).toHaveBeenCalledTimes(1);
  expect(second).not.toHaveBeenCalled();
});
it('runs a prechecked action directly and gates it again after unchecking', async () => {
  await click(checkbox());
  await click(button('First'));
  expect(first).toHaveBeenCalledTimes(1);
  expect(dialog()).toBeNull();
  await click(checkbox());
  await click(button('Second'));
  expect(second).not.toHaveBeenCalled();
  expect(dialog()).not.toBeNull();
});
it('clears stale pending work on a mode change but retains explicit agreement', async () => {
  await click(button('First'));
  await render('email');
  expect(dialog()).toBeNull();
  expect(first).not.toHaveBeenCalled();
  await click(checkbox());
  await render('password');
  expect(checkbox().getAttribute('aria-checked')).toBe('true');
  await click(button('Second'));
  expect(second).toHaveBeenCalledTimes(1);
});
it('resets agreement when leaving and re-entering the auth page', async () => {
  await click(checkbox());
  await render('email', 'register');
  expect(checkbox().getAttribute('aria-checked')).toBe('false');
});
it('keeps agreement links independent of the checkbox and pending operation', async () => {
  const links = [...container.querySelectorAll('a')];
  expect(links.map(node => node.href)).toEqual([
    'https://www.omnibox.pro/s/w3A0gJXVUI',
    'https://www.omnibox.pro/s/qYdPydLfW7',
  ]);
  for (const link of links) {
    expect(link.target).toBe('_blank');
    await click(link);
    expect(checkbox().getAttribute('aria-checked')).toBe('false');
  }
  await click(button('First'));
  expect(dialog()?.querySelectorAll('a')).toHaveLength(2);
  await click(dialog()!.querySelector('a')!);
  expect(first).not.toHaveBeenCalled();
  expect(dialog()).not.toBeNull();
});
it('renders complete English copy and links without resetting agreement', async () => {
  await click(checkbox());
  await act(async () => {
    await i18n.changeLanguage('en');
  });
  expect(container.textContent).toContain(
    'I have read and agree to the Terms of Service and Privacy Policy.'
  );
  expect(checkbox().getAttribute('aria-checked')).toBe('true');
  await click(checkbox());
  await click(button('First'));
  expect(dialog()?.textContent).toContain(
    'Before continuing, please read and agree to OmniBox’s Terms of Service and Privacy Policy.'
  );
  await click(button('Agree and continue'));
  expect(first).toHaveBeenCalledTimes(1);
});
