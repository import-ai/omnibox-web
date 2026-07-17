import { focusResourceDialogOnOpen } from './chatToolFocus';

describe('focusResourceDialogOnOpen', () => {
  it('moves initial focus to the dialog container', () => {
    const preventDefault = jest.fn();
    const focus = jest.fn();

    focusResourceDialogOnOpen(
      { preventDefault } as unknown as Event,
      { focus } as unknown as HTMLDivElement,
      true
    );

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('keeps Radix autofocus for keyboard navigation', () => {
    const preventDefault = jest.fn();

    focusResourceDialogOnOpen(
      { preventDefault } as unknown as Event,
      null,
      false
    );

    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('still prevents pointer autofocus before the ref is ready', () => {
    const preventDefault = jest.fn();

    focusResourceDialogOnOpen(
      { preventDefault } as unknown as Event,
      null,
      true
    );

    expect(preventDefault).toHaveBeenCalledTimes(1);
  });
});
