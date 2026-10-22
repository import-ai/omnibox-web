/** @jest-environment jsdom */

import { act, type ButtonHTMLAttributes } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import DecisionInput from './DecisionInput';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/page/chat/components/ToolCallArgs', () => ({
  ToolCallArgs: () => null,
}));

jest.mock('@/lib/toolArgs', () => ({ processArgs: () => [] }));

jest.mock('@/components/button', () => ({
  Button: (props: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props} />
  ),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const interrupts = [
  { name: 'create_resource', args: {}, decisions: ['approve', 'reject'] },
];

describe('DecisionInput keyboard shortcuts', () => {
  let container: HTMLDivElement;
  let root: Root;
  let sendButton: HTMLButtonElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    // Stands in for the composer's send button next to the card.
    sendButton = document.createElement('button');
    document.body.appendChild(sendButton);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    sendButton.remove();
  });

  async function render(sendMessage: jest.Mock) {
    await act(async () =>
      root.render(
        <DecisionInput
          interrupts={interrupts as never}
          approvalMode="manual"
          sendMessage={sendMessage}
        />
      )
    );
  }

  function press(key: string, target: EventTarget = document.body) {
    act(() => {
      target.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true })
      );
    });
  }

  it('ignores Enter and Space pressed on a focused composer control', async () => {
    const sendMessage = jest.fn();
    await render(sendMessage);

    sendButton.focus();
    press('Enter', sendButton);
    press(' ', sendButton);

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('decides with Enter when nothing else has focus', async () => {
    const sendMessage = jest.fn();
    await render(sendMessage);

    (document.activeElement as HTMLElement | null)?.blur();
    press('Enter');

    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ decisions: [{ type: 'approve' }] })
    );
  });

  it('decides with Enter while a button of the card has focus', async () => {
    const sendMessage = jest.fn();
    await render(sendMessage);

    const reject = [...container.querySelectorAll('button')].find(button =>
      button.textContent?.includes('chat.decision.reject')
    ) as HTMLButtonElement;
    reject.focus();
    press('Enter', reject);

    expect(sendMessage).toHaveBeenCalledTimes(1);
  });
});
