/** @jest-environment jsdom */

import { focusComposerOnTap } from './composerTapFocus';

function createTextarea() {
  const textarea = document.createElement('textarea');
  document.body.appendChild(textarea);
  return textarea;
}

describe('focusComposerOnTap', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('leaves the first tap to the browser so WeChat can open the IME', () => {
    const textarea = createTextarea();
    const focus = jest.spyOn(textarea, 'focus');

    focusComposerOnTap(textarea, false);

    expect(focus).not.toHaveBeenCalled();
  });

  it('reopens the IME by moving focus through a non-editable probe', () => {
    const textarea = createTextarea();
    textarea.focus();
    const blur = jest.spyOn(textarea, 'blur');
    const textareaFocus = jest.spyOn(textarea, 'focus');
    const probeFocus = jest.spyOn(HTMLButtonElement.prototype, 'focus');

    focusComposerOnTap(textarea, false);

    expect(blur).not.toHaveBeenCalled();
    expect(probeFocus).toHaveBeenCalledWith({ preventScroll: true });
    expect(textareaFocus).toHaveBeenCalledWith({ preventScroll: true });
    expect(document.activeElement).toBe(textarea);
    expect(document.querySelector('button')).toBeNull();
  });

  it('leaves the focus alone while a keyboard is up', () => {
    const textarea = createTextarea();
    textarea.focus();
    const blur = jest.spyOn(textarea, 'blur');
    const focus = jest.spyOn(textarea, 'focus');

    focusComposerOnTap(textarea, true);

    expect(blur).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
  });
});
