/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import useApp from '@/hooks/useApp';
import { http } from '@/lib/request';

import HeaderTitle from './HeaderTitle';

jest.mock('react', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  return { ...react, default: react };
});
jest.mock('@/hooks/useApp');
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
      fire: jest.fn(),
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
});
