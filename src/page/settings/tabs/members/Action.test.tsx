/** @jest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { toast } from 'sonner';

import { http } from '@/lib/request';
import { trackButtonClick } from '@/lib/trackButtonClick';

import Action from './Action';

const fire = jest.fn();
const refetch = jest.fn();
jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => ({ fire }),
}));
jest.mock('@/lib/request', () => ({
  http: { delete: jest.fn(() => Promise.resolve()) },
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn() } }));

let host: HTMLDivElement;
let root: Root;

beforeEach(async () => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root.render(
      <Action
        value="member"
        id="member"
        namespace_id="namespace"
        hasOwner
        currentUserRole="owner"
        refetch={refetch}
      />
    )
  );
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

async function openRemoval() {
  const trigger = host.querySelector('button[aria-haspopup="menu"]');
  if (!trigger) throw new Error('Missing role menu');
  await act(async () =>
    trigger.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    )
  );
  const remove = Array.from(
    document.querySelectorAll('[role="menuitem"]')
  ).find(item => item.textContent === 'manage.remove');
  if (!(remove instanceof HTMLElement))
    throw new Error('Missing remove action');
  await act(async () => remove.click());
}

async function choose(label: string) {
  const button = Array.from(
    document.querySelectorAll('[role="alertdialog"] button')
  ).find(item => item.textContent === label);
  if (!(button instanceof HTMLButtonElement))
    throw new Error('Missing dialog action');
  await act(async () => button.click());
}

it('keeps successful member removal separate from user cancellation', async () => {
  await openRemoval();
  await choose('ok');
  expect(http.delete).toHaveBeenCalledWith(
    'namespaces/namespace/members/member'
  );
  expect(refetch).toHaveBeenCalledTimes(1);
  expect(fire).toHaveBeenCalledTimes(1);
  expect(toast.success).toHaveBeenCalledTimes(1);
  expect(
    jest.mocked(trackButtonClick).mock.calls.map(([name]) => name)
  ).toEqual(['settings_member_remove', 'settings_member_confirm']);
  expect(document.querySelector('[role="alertdialog"]')).toBeNull();
});

it('reports user cancellation once and does not remove the member', async () => {
  await openRemoval();
  await choose('cancel');
  expect(http.delete).not.toHaveBeenCalled();
  expect(
    jest.mocked(trackButtonClick).mock.calls.map(([name]) => name)
  ).toEqual(['settings_member_remove', 'settings_member_cancel']);
  expect(document.querySelector('[role="alertdialog"]')).toBeNull();
});
