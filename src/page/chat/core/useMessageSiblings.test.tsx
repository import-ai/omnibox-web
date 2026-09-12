/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { useMessageSiblings } from './useMessageSiblings';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

it('renders an unsaved user message without conversation navigation', async () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  function PendingMessage() {
    const { hasSiblings, handlePrevious, handleNext } =
      useMessageSiblings('pending-home-query');
    return (
      <button
        onClick={() => {
          handlePrevious();
          handleNext();
        }}
      >
        {hasSiblings ? 'Navigate' : 'Pending'}
      </button>
    );
  }
  try {
    await act(async () => root.render(<PendingMessage />));
    expect(container.textContent).toBe('Pending');
    await act(async () => container.querySelector('button')!.click());
    expect(container.textContent).toBe('Pending');
  } finally {
    await act(async () => root.unmount());
  }
});
