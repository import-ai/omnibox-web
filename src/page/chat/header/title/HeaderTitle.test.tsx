/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { TooltipProvider } from '@/components/tooltip';
import useApp from '@/hooks/useApp';
import { http } from '@/lib/request';

import Actions from '../Actions';
import HeaderTitle from './HeaderTitle';

jest.mock('react', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  return { ...react, default: react };
});
jest.mock('@/hooks/useApp');
jest.mock('@/components/confirm-delete-dialog', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }));
jest.mock('@/lib/chatBridge', () => ({
  resetChatForNamespaceSwitch: jest.fn(),
}));
jest.mock('@/lib/request', () => ({ http: { patch: jest.fn() } }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('HeaderTitle rename', () => {
  let container: HTMLDivElement;
  let root: Root;
  let listeners: Set<() => void>;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    listeners = new Set();
    jest.mocked(useApp).mockReturnValue({
      fire: (event: string) => {
        if (event === 'chat:title:edit')
          listeners.forEach(listener => listener());
      },
      on: (event: string, listener: () => void) => {
        if (event === 'chat:title:edit') listeners.add(listener);
        return () => listeners.delete(listener);
      },
    } as unknown as ReturnType<typeof useApp>);
    jest.mocked(http.patch).mockReset();
    jest.mocked(http.patch).mockResolvedValue({});
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    expect(listeners.size).toBe(0);
  });

  async function render(title: string, conversationId = 'conversation-a') {
    await act(async () =>
      root.render(
        <HeaderTitle
          data={title}
          editable
          namespaceId="space"
          conversationId={conversationId}
        />
      )
    );
  }

  async function openFromMenu() {
    await act(async () => listeners.forEach(listener => listener()));
  }

  function input() {
    return document.querySelector<HTMLInputElement>('[role="dialog"] input')!;
  }

  async function close() {
    await act(async () =>
      document
        .querySelector('[role="dialog"] button .sr-only')!
        .closest('button')!
        .click()
    );
  }

  it('prefills the title loaded after the header first renders', async () => {
    await render('');
    await render('添加言情文标签');
    await openFromMenu();

    expect(input().value).toBe('添加言情文标签');
    expect(http.patch).not.toHaveBeenCalled();
  });

  it('uses the latest conversation when saving after navigation', async () => {
    await render('Conversation A');
    await render('Conversation B', 'conversation-b');
    await openFromMenu();

    expect(input().value).toBe('Conversation B');
    await act(async () =>
      document
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    );
    expect(http.patch).toHaveBeenCalledWith(
      'namespaces/space/conversations/conversation-b',
      { title: 'Conversation B' }
    );
  });

  it('reopens with the current title through both rename entry points', async () => {
    await render('Original title');
    await act(async () => container.querySelector('button')!.click());
    expect(input().value).toBe('Original title');
    await close();

    await render('Updated title');
    await openFromMenu();
    expect(input().value).toBe('Updated title');
    expect(listeners.size).toBe(1);
  });

  it('keeps the caret at the end after the actions menu closes', async () => {
    await act(async () =>
      root.render(
        <TooltipProvider>
          <HeaderTitle
            data="太阳系三句话介绍"
            editable
            namespaceId="space"
            conversationId="conversation-a"
          />
          <Actions
            homePage={false}
            chatTitle="太阳系三句话介绍"
            conversationId="conversation-a"
            conversationsPage={false}
            namespaceId="space"
          />
        </TooltipProvider>
      )
    );
    const trigger = container.querySelector<HTMLElement>(
      '[aria-haspopup="menu"]'
    )!;
    await act(async () => {
      trigger.focus();
      trigger.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
    });
    const rename = Array.from(
      document.querySelectorAll<HTMLElement>('[role="menuitem"]')
    ).find(item => item.textContent === 'chat.conversations.rename.option')!;
    await act(async () => rename.click());
    await act(async () => new Promise(resolve => setTimeout(resolve, 10)));

    expect(input().value).toBe('太阳系三句话介绍');
    expect(document.activeElement).toBe(input());
    expect(input().selectionStart).toBe(input().value.length);
    expect(input().selectionEnd).toBe(input().value.length);
  });
});
