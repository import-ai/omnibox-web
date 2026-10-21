/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import ConversationRenameDialog from './conversations/edit';
import HeaderRenameDialog from './header/title/edit';

jest.mock('react', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  return { ...react, default: react };
});
jest.mock('@/lib/request', () => ({ http: { patch: jest.fn() } }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe.each([
  ['header', HeaderRenameDialog],
  ['conversation list', ConversationRenameDialog],
] as const)('%s rename dialog', (_name, RenameDialog) => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  async function render(title: string, open = true) {
    await act(async () =>
      root.render(
        <RenameDialog
          data={{ id: 'conversation', title, open }}
          namespaceId="space"
          onOpenChange={jest.fn()}
          onFinish={jest.fn()}
        />
      )
    );
  }

  function expectCaretAtEnd(title: string) {
    const input = document.querySelector<HTMLInputElement>(
      '[role="dialog"] input'
    )!;
    expect(input.value).toBe(title);
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(title.length);
    expect(input.selectionEnd).toBe(title.length);
    return input;
  }

  it('focuses the prefilled title at its end each time it opens', async () => {
    await render('太阳系 🌞');
    expectCaretAtEnd('太阳系 🌞');

    await render('太阳系 🌞', false);
    await render('Updated conversation');
    expectCaretAtEnd('Updated conversation');
  });

  it('preserves a manually moved caret while the dialog remains open', async () => {
    await render('Original title');
    const input = expectCaretAtEnd('Original title');
    input.setSelectionRange(2, 2);

    await render('Original title');
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(2);
    expect(input.selectionEnd).toBe(2);
  });
});
