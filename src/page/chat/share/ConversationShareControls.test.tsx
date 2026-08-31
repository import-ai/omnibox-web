/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { ConversationShareActions } from './ConversationShareControls';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) =>
      key === 'chat.share.selectionSummary'
        ? `selected:${options?.count}`
        : key,
  }),
}));

describe('ConversationShareActions', () => {
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

  it('renders the desktop selection bar and exposes its three actions', () => {
    const onClose = jest.fn();
    const onShare = jest.fn();
    const onToggleAll = jest.fn();

    act(() => {
      root.render(
        <ConversationShareActions
          allSelected={false}
          canShare
          isSharing={false}
          onClose={onClose}
          onShare={onShare}
          onToggleAll={onToggleAll}
          selectedCount={2}
          sharingChannel={null}
        />
      );
    });

    expect(container.textContent).toContain('chat.share.selectAll');
    expect(container.textContent).toContain('selected:2');
    expect(container.textContent).not.toContain('chat.share.wechatSession');
    expect(container.textContent).not.toContain('chat.share.wechatTimeline');

    const buttons = Array.from(container.querySelectorAll('button'));
    const selectAll = buttons.find(button =>
      button.textContent?.includes('chat.share.selectAll')
    );
    const cancel = buttons.find(button => button.textContent === 'cancel');
    const copy = buttons.find(button =>
      button.textContent?.includes('chat.share.copyLink')
    );
    const summary = Array.from(container.querySelectorAll('span')).find(
      element => element.textContent === 'selected:2'
    );
    const actionLayout = container.querySelector('section > div');

    expect(actionLayout?.className).toContain('px-4');
    expect(actionLayout?.className).toContain('max-w-[800px]');
    expect(actionLayout?.className).not.toContain('md:px-0');
    expect(summary?.className).toContain('text-[#292B33]');
    expect(cancel?.className).toContain('rounded-lg');
    expect(cancel?.className).toContain('border-[#D6DBE3]');
    expect(copy?.className).toContain('bg-[#121316]');
    for (const action of [cancel, copy]) {
      expect(action?.className).toContain('h-[26px]');
      expect(action?.className).toContain('w-auto');
      expect(action?.className).toContain('px-3');
      expect(action?.className).toContain('py-[5px]');
      expect(action?.className).toContain('text-[13px]');
      expect(action?.className).toContain('leading-4');
      expect(action?.className).not.toMatch(/min-w-/);
    }

    act(() => selectAll?.click());
    act(() => cancel?.click());
    act(() => copy?.click());

    expect(onToggleAll).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onShare).toHaveBeenCalledWith('copy_link');
  });

  it('disables copy when no conversation group is selected', () => {
    act(() => {
      root.render(
        <ConversationShareActions
          allSelected={false}
          canShare={false}
          isSharing={false}
          onClose={jest.fn()}
          onShare={jest.fn()}
          onToggleAll={jest.fn()}
          selectedCount={0}
          sharingChannel={null}
        />
      );
    });

    const copy = Array.from(container.querySelectorAll('button')).find(button =>
      button.textContent?.includes('chat.share.copyLink')
    );
    expect(copy?.disabled).toBe(true);
  });
});
