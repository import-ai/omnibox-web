/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import UserCard from './index';

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

describe('UserCard', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  it('shows nickname with username in parentheses and full identity on hover', async () => {
    await act(async () =>
      root.render(
        <UserCard
          username="Alice"
          email="alice@example.com"
          nickname="Lizhi"
          note="Finance"
        />
      )
    );

    expect(container.textContent).toContain('Lizhi（Alice）');
    expect(container.textContent).toContain('Finance');
    expect(container.querySelector('.cursor-pointer')).not.toBeNull();
    const tooltip = container.querySelector('[data-testid="identity-tooltip"]');
    expect(tooltip?.textContent).toContain('Username');
    expect(tooltip?.textContent).toContain('Alice');
    expect(tooltip?.textContent).toContain('Email');
    expect(tooltip?.textContent).toContain('alice@example.com');
    expect(tooltip?.textContent).toContain('Nickname');
    expect(tooltip?.textContent).toContain('Lizhi');
    expect(tooltip?.textContent).toContain('Note');
    expect(tooltip?.textContent).toContain('Finance');
  });

  it('looks like the original card when nickname and note are empty', async () => {
    await act(async () =>
      root.render(<UserCard username="Alice" email="alice@example.com" />)
    );

    expect(container.textContent).toContain('Alice');
    expect(container.textContent).toContain('alice@example.com');
    expect(container.textContent).not.toContain('Lizhi（');
    const tooltip = container.querySelector('[data-testid="identity-tooltip"]');
    expect(tooltip?.textContent).not.toContain('Nickname');
    expect(tooltip?.textContent).not.toContain('Note');
  });
});
