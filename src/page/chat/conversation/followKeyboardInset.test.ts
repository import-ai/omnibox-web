/** @jest-environment jsdom */

import {
  nextStickToBottomScrollTop,
  nextStickToBottomViewportScrollTop,
} from './followKeyboardInset';

describe('nextStickToBottomScrollTop', () => {
  it('keeps the last message pinned by the spacer delta', () => {
    expect(nextStickToBottomScrollTop(120, 80)).toBe(200);
    expect(nextStickToBottomScrollTop(120, -40)).toBe(80);
  });

  it('does not pull the list above the top while the keyboard closes', () => {
    expect(nextStickToBottomScrollTop(10, -40)).toBe(0);
  });

  it('pins the last message when the keyboard shrinks the viewport', () => {
    expect(nextStickToBottomViewportScrollTop(800, 320)).toBe(480);
    expect(nextStickToBottomViewportScrollTop(200, 400)).toBe(0);
  });
});
