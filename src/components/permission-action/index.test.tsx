/** @jest-environment jsdom */
import { act, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { http } from '@/lib/request';
import { trackButtonClick } from '@/lib/trackButtonClick';

import PermissionAction from './index';

jest.mock('@/lib/request', () => ({
  http: {
    patch: jest.fn(() => Promise.resolve()),
    delete: jest.fn(() => Promise.resolve()),
  },
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('./Action', () => ({
  __esModule: true,
  default: ({
    onChange,
    afterAddon,
  }: ComponentProps<typeof import('./Action').default>) => (
    <div>
      <button onClick={() => onChange?.('can_view')}>Demote</button>
      {afterAddon}
    </div>
  ),
}));
jest.mock('@/components/ui/DropdownMenu', () => ({
  DropdownMenuSeparator: () => null,
  DropdownMenuItem: ({
    children,
    onClick,
    disabled,
  }: ComponentProps<'button'>) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  localStorage.setItem('uid', 'me');
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  localStorage.clear();
});

async function renderAction(
  props: Partial<ComponentProps<typeof PermissionAction>> = {}
) {
  await act(async () =>
    root.render(
      <PermissionAction
        user_id="me"
        namespace_id="namespace"
        resource_id="resource"
        value="full_access"
        canNoAccess={false}
        refetch={jest.fn()}
        {...props}
      />
    )
  );
}

async function click(label: string) {
  const button = Array.from(document.querySelectorAll('button')).find(
    item => item.textContent === label
  );
  if (!button) throw new Error(`Missing button: ${label}`);
  await act(async () => button.click());
}

function events() {
  return jest.mocked(trackButtonClick).mock.calls.map(([name]) => name);
}

it('confirms a demotion without reporting a cancellation', async () => {
  await renderAction();
  await click('Demote');
  await click('permission.ok');
  expect(http.patch).toHaveBeenCalledWith(
    'namespaces/namespace/resources/resource/permissions/users/me',
    { permission: 'can_view' },
    { muteCodes: ['owner_full_access_required'] }
  );
  expect(events()).toEqual([
    'resource_permission_select',
    'resource_permission_confirm',
  ]);
  expect(document.querySelector('[role="alertdialog"]')).toBeNull();
});

it('reports an explicit demotion cancellation once without a request', async () => {
  await renderAction();
  await click('Demote');
  await click('permission.cancel');
  expect(events()).toEqual([
    'resource_permission_select',
    'resource_permission_cancel',
  ]);
  expect(http.patch).not.toHaveBeenCalled();
});

it.each(['me', 'other'])(
  'removes %s without reporting a cancellation',
  async userId => {
    await renderAction({ user_id: userId });
    await click('permission.remove_resource');
    if (userId === 'me') await click('permission.ok');
    expect(http.delete).toHaveBeenCalledTimes(1);
    expect(events()).toEqual(['resource_permission_remove']);
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  }
);

it('reports an explicit removal cancellation once without a request', async () => {
  await renderAction();
  await click('permission.remove_resource');
  await click('permission.cancel');
  expect(events()).toEqual([
    'resource_permission_remove',
    'resource_permission_cancel',
  ]);
  expect(http.delete).not.toHaveBeenCalled();
});

it('transitions to the grant notice without reporting a cancellation', async () => {
  await renderAction({ alertWhenDelete: true });
  await click('permission.remove_resource');
  await click('permission.ok');
  expect(events()).toEqual(['resource_permission_remove']);
  expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain(
    'permission.grant_permission'
  );
  expect(http.delete).not.toHaveBeenCalled();
});
