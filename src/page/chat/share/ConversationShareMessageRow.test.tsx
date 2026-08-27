/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { ConversationShareMessageRow } from './ConversationShareMessageRow';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('ConversationShareMessageRow', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it('only makes the control sticky when the message is selected', () => {
    act(() => {
      root.render(
        <ConversationShareMessageRow
          groupId="question-1"
          onToggle={jest.fn()}
          selected={false}
        >
          Message
        </ConversationShareMessageRow>
      );
    });
    expect(container.querySelector('.sticky')).toBeNull();

    act(() => {
      root.render(
        <ConversationShareMessageRow
          groupId="question-1"
          onToggle={jest.fn()}
          selected
        >
          Message
        </ConversationShareMessageRow>
      );
    });
    const stickyControl = container.querySelector('.sticky');
    expect(stickyControl).not.toBeNull();
    expect(stickyControl?.classList.contains('top-0')).toBe(true);
    expect(stickyControl?.classList.contains('top-2')).toBe(false);
  });

  it('toggles the complete group when the message row is clicked', () => {
    const onToggle = jest.fn();
    act(() => {
      root.render(
        <ConversationShareMessageRow
          groupId="question-1"
          onToggle={onToggle}
          selected
        >
          Message
        </ConversationShareMessageRow>
      );
    });

    act(() => {
      container.querySelector<HTMLElement>('[role="checkbox"]')?.click();
    });
    expect(onToggle).toHaveBeenCalledWith('question-1');
  });
});
