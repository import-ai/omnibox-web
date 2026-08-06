import { shouldNavigateTitleToBody } from './titleNavigation';

function event(
  key: string,
  mods: Partial<{
    isComposing: boolean;
    altKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
  }> = {}
) {
  return {
    key,
    altKey: mods.altKey ?? false,
    ctrlKey: mods.ctrlKey ?? false,
    metaKey: mods.metaKey ?? false,
    shiftKey: mods.shiftKey ?? false,
    nativeEvent: { isComposing: mods.isComposing ?? false },
  };
}

describe('shouldNavigateTitleToBody', () => {
  it('moves to body on Enter', () => {
    expect(
      shouldNavigateTitleToBody(event('Enter'), {
        start: 0,
        end: 0,
        length: 5,
      })
    ).toBe(true);
  });

  it('moves to body on ArrowDown with collapsed caret', () => {
    expect(
      shouldNavigateTitleToBody(event('ArrowDown'), {
        start: 2,
        end: 2,
        length: 5,
      })
    ).toBe(true);
  });

  it('moves to body on ArrowRight only at the end', () => {
    expect(
      shouldNavigateTitleToBody(event('ArrowRight'), {
        start: 5,
        end: 5,
        length: 5,
      })
    ).toBe(true);
    expect(
      shouldNavigateTitleToBody(event('ArrowRight'), {
        start: 2,
        end: 2,
        length: 5,
      })
    ).toBe(false);
  });

  it('ignores modified keys and non-collapsed selection for arrows', () => {
    expect(
      shouldNavigateTitleToBody(event('ArrowDown', { metaKey: true }), {
        start: 0,
        end: 0,
        length: 3,
      })
    ).toBe(false);
    expect(
      shouldNavigateTitleToBody(event('ArrowRight'), {
        start: 1,
        end: 3,
        length: 5,
      })
    ).toBe(false);
  });
});
