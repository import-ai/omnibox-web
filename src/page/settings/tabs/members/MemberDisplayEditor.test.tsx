/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { Member } from '@/interface';
import { http } from '@/lib/request';

import MemberDisplayEditor, {
  focusEditorFieldAtEnd,
} from './MemberDisplayEditor';

const mockPatch = http.patch as jest.Mock;

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        'manage.nickname': 'Nickname',
        'manage.note': 'Note',
        'manage.note_private_hint': 'Only visible to you',
        'manage.nickname_visible_hint': 'Visible to all members in this team',
        'manage.nickname_placeholder': 'What to call you in this namespace',
        'manage.note_placeholder': 'A note about this person',
        'manage.submit': 'Save',
      })[key] ?? key,
  }),
}));

jest.mock('@/lib/request', () => ({
  http: { patch: jest.fn() },
}));

jest.mock('@/components/button', () => ({
  Button: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

jest.mock('@/components/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => children,
  Tooltip: ({ children }: { children: React.ReactNode }) => children,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => children,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="pencil-tooltip">{children}</span>
  ),
}));

jest.mock('@/components/ui/Label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => (
    <label>{children}</label>
  ),
}));

jest.mock('@/components/ui/Input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

jest.mock('@/components/ui/Textarea', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} />
  ),
}));

jest.mock('@/components/ui/Popover', () => {
  const React = require('react');
  return {
    Popover: ({
      children,
    }: {
      children: React.ReactNode;
      onOpenChange?: (open: boolean) => void;
    }) => children,
    PopoverTrigger: ({ children }: { children: React.ReactNode }) => children,
    PopoverContent: ({
      children,
      onOpenAutoFocus,
    }: {
      children: React.ReactNode;
      onOpenAutoFocus?: (event: Event) => void;
    }) => {
      const ref = React.useRef<HTMLDivElement>(null);
      React.useLayoutEffect(() => {
        if (!ref.current) {
          return;
        }
        onOpenAutoFocus?.({
          preventDefault() {},
          currentTarget: ref.current,
        } as unknown as Event);
      }, [onOpenAutoFocus]);
      return (
        <div ref={ref} data-testid="display-editor">
          {children}
        </div>
      );
    },
  };
});

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const selfMember: Member = {
  id: 'member-1',
  user_id: 'user-1',
  username: 'Alice',
  email: 'alice@example.com',
  nickname: '荔枝',
  note: '嘿嘿',
  role: 'member',
  permission: 'can_view',
};

const otherMember: Member = {
  ...selfMember,
  id: 'member-2',
  user_id: 'user-2',
  username: 'Bob',
  email: 'bob@example.com',
};

describe('MemberDisplayEditor', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.setItem('uid', 'user-1');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockPatch.mockReset();
    mockPatch.mockResolvedValue({});
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    localStorage.clear();
  });

  it('lets the current user edit only nickname with a team-visible hint', async () => {
    await act(async () =>
      root.render(
        <MemberDisplayEditor
          member={selfMember}
          namespaceId="namespace-1"
          canEditNickname
          refetch={jest.fn()}
        />
      )
    );

    const editor = container.querySelector('[data-testid="display-editor"]');
    expect(
      container.querySelector('button[aria-label="Nickname"]')
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="pencil-tooltip"]')?.textContent
    ).toBe('Nickname');
    expect(container.querySelector('#member-nickname-user-1')).not.toBeNull();
    expect(editor?.textContent).toContain(
      'Visible to all members in this team'
    );
    expect(container.querySelector('#member-note-user-1')).toBeNull();
    expect(editor?.textContent).not.toContain('Only visible to you');
  });

  it('lets other members be annotated with a private note only', async () => {
    await act(async () =>
      root.render(
        <MemberDisplayEditor
          member={otherMember}
          namespaceId="namespace-1"
          canEditNickname={false}
          refetch={jest.fn()}
        />
      )
    );

    const editor = container.querySelector('[data-testid="display-editor"]');
    expect(container.querySelector('button[aria-label="Note"]')).not.toBeNull();
    expect(
      container.querySelector('[data-testid="pencil-tooltip"]')?.textContent
    ).toBe('Note');
    expect(container.querySelector('#member-note-user-2')).not.toBeNull();
    expect(editor?.textContent).toContain('Only visible to you');
    expect(container.querySelector('#member-nickname-user-2')).toBeNull();
    expect(editor?.textContent).not.toContain(
      'Visible to all members in this team'
    );
  });

  it('saves on Enter and ignores Shift+Enter or IME Enter', async () => {
    await act(async () =>
      root.render(
        <MemberDisplayEditor
          member={selfMember}
          namespaceId="namespace-1"
          canEditNickname
          refetch={jest.fn()}
        />
      )
    );

    const input = container.querySelector(
      '#member-nickname-user-1'
    ) as HTMLInputElement;

    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          cancelable: true,
          shiftKey: true,
        })
      );
    });
    expect(mockPatch).not.toHaveBeenCalled();

    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          cancelable: true,
          isComposing: true,
        })
      );
    });
    expect(mockPatch).not.toHaveBeenCalled();

    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          cancelable: true,
        })
      );
    });
    expect(mockPatch).toHaveBeenCalledWith(
      '/namespaces/namespace-1/members/user-1/profile',
      { nickname: '荔枝' }
    );
  });

  it('places the caret at the end when the editor opens', async () => {
    await act(async () =>
      root.render(
        <MemberDisplayEditor
          member={otherMember}
          namespaceId="namespace-1"
          canEditNickname={false}
          refetch={jest.fn()}
        />
      )
    );

    const textarea = container.querySelector(
      '#member-note-user-2'
    ) as HTMLTextAreaElement;
    expect(textarea.selectionStart).toBe(textarea.value.length);
    expect(textarea.selectionEnd).toBe(textarea.value.length);
  });
});

describe('focusEditorFieldAtEnd', () => {
  it('moves the caret to the end of an existing value', () => {
    const wrapper = document.createElement('div');
    const field = document.createElement('textarea');
    field.value = '水清源';
    wrapper.appendChild(field);
    document.body.appendChild(wrapper);
    field.setSelectionRange(0, 0);

    const preventDefault = jest.fn();
    focusEditorFieldAtEnd({
      preventDefault,
      currentTarget: wrapper,
    } as unknown as Event);

    expect(preventDefault).toHaveBeenCalled();
    expect(field.selectionStart).toBe(3);
    expect(field.selectionEnd).toBe(3);
    wrapper.remove();
  });
});
