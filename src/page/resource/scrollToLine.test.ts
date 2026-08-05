/** @jest-environment jsdom */
import { parseScrollToLine, scrollRenderedContentToLine } from './scrollToLine';

describe('parseScrollToLine', () => {
  it('accepts positive one-based integers', () => {
    expect(parseScrollToLine('1')).toBe(1);
    expect(parseScrollToLine('42')).toBe(42);
  });

  it('rejects invalid line values', () => {
    expect(parseScrollToLine(null)).toBeUndefined();
    expect(parseScrollToLine('0')).toBeUndefined();
    expect(parseScrollToLine('-1')).toBeUndefined();
    expect(parseScrollToLine('1.5')).toBeUndefined();
  });
});

describe('scrollRenderedContentToLine', () => {
  it('scrolls to a line inside one rendered text block', () => {
    const container = document.createElement('div');
    container.textContent = 'one\ntwo\nthree';
    const scrollIntoView = jest.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    expect(scrollRenderedContentToLine(container, 'one\ntwo\nthree', 2)).toBe(
      true
    );
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
    expect(container.textContent).toBe('one\ntwo\nthree');
  });

  it('matches rendered text after markdown markers are removed', () => {
    const container = document.createElement('div');
    container.innerHTML = '<h2>Target heading</h2>';
    Element.prototype.scrollIntoView = jest.fn();

    expect(scrollRenderedContentToLine(container, '## Target heading', 1)).toBe(
      true
    );
  });
});
