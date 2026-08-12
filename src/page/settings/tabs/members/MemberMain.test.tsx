/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import MemberMain from './MemberMain';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        'manage.add': 'Add',
        'manage.permission': 'Permission',
        'manage.role': 'Role',
        'manage.user': 'User',
        'permission.you': '（你）',
      })[key] ?? key,
  }),
}));

jest.mock('@/components/invite-dialog', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/components/button', () => ({
  Button: ({ children }: { children: React.ReactNode }) => (
    <button>{children}</button>
  ),
}));

jest.mock('@/components/search/SearchField', () => ({
  SearchField: () => null,
}));

jest.mock('@/components/permission-action', () => ({
  __esModule: true,
  default: ({ disabled }: { disabled?: boolean }) => (
    <button data-testid="permission" disabled={disabled} />
  ),
}));

jest.mock('./Action', () => ({
  __esModule: true,
  default: ({ disabled }: { disabled?: boolean }) => (
    <button data-testid="role" disabled={disabled} />
  ),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('MemberMain', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.setItem('uid', 'user-1');
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    localStorage.clear();
  });

  it('renders a member-only view with disabled controls and marks the current user', async () => {
    await act(async () =>
      root.render(
        <MemberMain
          search=""
          refetch={jest.fn()}
          onSearch={jest.fn()}
          namespace_id="namespace-1"
          namespaceName="Workspace"
          canManageMembers={false}
          data={[
            {
              user_id: 'user-1',
              username: 'Alice',
              email: 'alice@example.com',
              role: 'member',
              permission: 'can_view',
            },
            {
              user_id: 'user-2',
              username: 'Bob',
              email: 'bob@example.com',
              role: 'admin',
              permission: 'full_access',
            },
          ]}
        />
      )
    );

    expect(container.textContent).toContain('Alice（你）');
    expect(container.textContent).not.toContain('Add');
    expect(
      Array.from(container.querySelectorAll<HTMLButtonElement>('button')).every(
        button => button.disabled
      )
    ).toBe(true);
  });
});
