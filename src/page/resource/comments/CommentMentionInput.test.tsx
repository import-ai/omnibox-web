/** @jest-environment jsdom */

import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { CommentMentionMenu } from './CommentMentionMenu';
import type { CommentMentionUser } from './commentMentions';
import { useCommentMentionInput } from './useCommentMentionInput';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let members: CommentMentionUser[];

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('./useCommentMentionUsers', () => ({
  useCommentMentionUsers: () => ({
    users: members,
    namesById: Object.fromEntries(members.map(user => [user.id, user.name])),
  }),
}));

function Probe() {
  const [value, setValue] = useState('@');
  const mention = useCommentMentionInput(value, setValue);
  return (
    <>
      <textarea
        value={mention.displayValue}
        {...mention.inputProps}
        onKeyDown={mention.onKeyDown}
      />
      <output>{value}</output>
      <CommentMentionMenu spec={mention.menu} />
    </>
  );
}

describe('comment mention input and menu', () => {
  let root: Root;
  let container: HTMLDivElement;

  const render = () => act(() => root.render(<Probe />));
  const input = () => container.querySelector('textarea')!;
  const menu = () => document.querySelector<HTMLElement>('[role="listbox"]')!;
  const active = () =>
    document.querySelector<HTMLElement>(
      '[role="option"][aria-selected="true"]'
    );
  const press = (key: string, isComposing = false) => {
    act(() => {
      input().dispatchEvent(
        new KeyboardEvent('keydown', {
          key,
          isComposing,
          bubbles: true,
          cancelable: true,
        })
      );
    });
  };
  const type = (value: string) => {
    act(() => {
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value'
      )!.set!.call(input(), value);
      input().setSelectionRange(value.length, value.length);
      input().dispatchEvent(new Event('input', { bubbles: true }));
    });
  };

  beforeEach(() => {
    members = Array.from({ length: 12 }, (_, index) => ({
      id: `u${index + 1}`,
      name: `Member ${String(index + 1).padStart(2, '0')}`,
    }));
    jest
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        const list = this.closest<HTMLElement>('[role="listbox"]');
        const index = list
          ? [...list.querySelectorAll('[role="option"]')].indexOf(this)
          : -1;
        const top = index >= 0 ? 100 + index * 40 - list!.scrollTop : 100;
        const height = this.getAttribute('role') === 'listbox' ? 192 : 40;
        return {
          top,
          bottom: top + height,
          left: 0,
          right: 256,
          width: 256,
          height,
          x: 0,
          y: top,
          toJSON: () => ({}),
        };
      });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    render();
    act(() => {
      input().focus();
      input().setSelectionRange(1, 1);
      input().click();
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.restoreAllMocks();
  });

  it('lets the keyboard reach the ninth member and keeps it visible', () => {
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(12);
    for (let index = 0; index < 8; index += 1) press('ArrowDown');
    expect(active()?.dataset.userId).toBe('u9');
    expect(menu().scrollTop).toBeGreaterThan(0);
    const selectedRect = active()!.getBoundingClientRect();
    const menuRect = menu().getBoundingClientRect();
    expect(selectedRect.top).toBeGreaterThanOrEqual(menuRect.top);
    expect(selectedRect.bottom).toBeLessThanOrEqual(menuRect.bottom);
    expect(document.activeElement).toBe(input());
    press('Enter');
    expect(container.querySelector('output')!.textContent).toBe(
      '[@ id="u9" label="Member 09"] '
    );
    expect(menu()).toBeNull();
  });

  it('scrolls to the last member on ArrowUp and back to the first on ArrowDown', () => {
    press('ArrowUp');
    expect(active()?.dataset.userId).toBe('u12');
    expect(menu().scrollTop).toBeGreaterThan(0);
    press('ArrowDown');
    expect(active()?.dataset.userId).toBe('u1');
    expect(menu().scrollTop).toBe(0);
  });

  it('preserves manual scrolling across unrelated renders', () => {
    const list = menu();
    list.scrollTop = 160;
    members = members.map(user => ({ ...user }));
    render();
    expect(menu()).toBe(list);
    expect(list.scrollTop).toBe(160);
    press('ArrowDown');
    expect(active()?.dataset.userId).toBe('u2');
    expect(active()!.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      list.getBoundingClientRect().top
    );
  });

  it('starts at the first candidate when filtering and clearing a query', () => {
    press('ArrowDown');
    press('ArrowDown');
    type('@Member');
    expect(active()?.dataset.userId).toBe('u1');
    type('@09');
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(1);
    expect(active()?.dataset.userId).toBe('u9');
    type('@missing');
    expect(menu()).toBeNull();
    type('@');
    expect(active()?.dataset.userId).toBe('u1');
    press('ArrowDown');
    type('@Member');
    expect(active()?.dataset.userId).toBe('u1');
    type('@');
    expect(active()?.dataset.userId).toBe('u1');
    press('ArrowUp');
    type('');
    type('@');
    expect(active()?.dataset.userId).toBe('u1');
  });

  it('keeps the selected member when a refreshed member list changes order', () => {
    press('ArrowDown');
    press('ArrowDown');
    expect(active()?.dataset.userId).toBe('u3');
    members = [members[2], members[0], members[1], ...members.slice(3)];
    render();
    expect(active()?.dataset.userId).toBe('u3');
    members = members.filter(user => user.id !== 'u3');
    render();
    expect(active()?.dataset.userId).toBe('u1');
  });

  it('inserts a clicked member beyond the eighth result without losing focus', () => {
    const option = document.querySelector<HTMLElement>('[data-user-id="u12"]');
    expect(option).not.toBeNull();
    act(() => {
      option!.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true })
      );
      option!.click();
    });
    expect(container.querySelector('output')!.textContent).toBe(
      '[@ id="u12" label="Member 12"] '
    );
    expect(document.activeElement).toBe(input());
  });

  it('ignores composition keys and dismisses the menu with Escape', () => {
    press('ArrowDown', true);
    press('Enter', true);
    expect(active()?.dataset.userId).toBe('u1');
    expect(container.querySelector('output')!.textContent).toBe('@');
    press('Escape');
    expect(menu()).toBeNull();
  });

  it('inserts the last candidate with Tab instead of submitting the comment', () => {
    press('ArrowUp');
    press('Tab');
    expect(container.querySelector('output')!.textContent).toBe(
      '[@ id="u12" label="Member 12"] '
    );
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(input());
  });

  it('reopens a dismissed query when the user starts a new mention', () => {
    press('Escape');
    expect(menu()).toBeNull();
    render();
    expect(menu()).toBeNull();
    type('');
    type('@');
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(12);
    expect(active()?.dataset.userId).toBe('u1');
  });
});
