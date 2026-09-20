/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { Member, UserPermission } from '@/interface';

import User from './User';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        'permission.you': '（你）',
        'form.username': 'Username',
        'form.email': 'Email',
        'manage.nickname': 'Nickname',
        'manage.note': 'Note',
      })[key] ?? key,
  }),
}));

jest.mock('@/components/permission-action', () => ({
  __esModule: true,
  default: () => <div data-testid="permission-action" />,
}));

jest.mock('@/components/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => children,
  Tooltip: ({ children }: { children: React.ReactNode }) => children,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => children,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="identity-tooltip">{children}</div>
  ),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('share permission users', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  it('shows namespace nickname and private note instead of username only', async () => {
    const data: UserPermission[] = [
      {
        id: 1,
        permission: 'full_access',
        role: 'admin',
        user: {
          id: 'user-2',
          email: 'wenguang.fe@gmail.com',
          username: 'mz2',
        } as UserPermission['user'],
      } as UserPermission,
    ];
    const members: Member[] = [
      {
        id: 'member-2',
        user_id: 'user-2',
        username: 'mz2',
        email: 'wenguang.fe@gmail.com',
        nickname: '文光嘻嘻',
        note: '后端',
        role: 'admin',
        permission: 'full_access',
      },
    ];

    await act(async () =>
      root.render(
        <User
          data={data}
          members={members}
          refetch={jest.fn()}
          resource_id="resource-1"
          namespace_id="namespace-1"
          current_permission="full_access"
          current_role="owner"
        />
      )
    );

    expect(container.textContent).toContain('文光嘻嘻（mz2）');
    expect(container.textContent).toContain('后端');
    expect(container.textContent).not.toMatch(/^[\s\S]*mz2\n/);
  });
});
