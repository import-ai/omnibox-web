/** @jest-environment jsdom */
import { parseScrollToLine, scrollRenderedContentToLine } from './scrollToLine';

describe('parseScrollToLine', () => {
  it('accepts positive one-based line anchors', () => {
    expect(parseScrollToLine('#L1')).toBe(1);
    expect(parseScrollToLine('L42')).toBe(42);
  });

  it('rejects invalid line values', () => {
    expect(parseScrollToLine(null)).toBeUndefined();
    expect(parseScrollToLine('#L0')).toBeUndefined();
    expect(parseScrollToLine('#L-1')).toBeUndefined();
    expect(parseScrollToLine('#L1.5')).toBeUndefined();
    expect(parseScrollToLine('#toc-1')).toBeUndefined();
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

  it('skips a target substring in an earlier line', () => {
    const container = document.createElement('div');
    container.innerHTML =
      '<p id="earlier">prefix target</p><p id="target">target</p>';
    let scrolledParentId = '';
    Element.prototype.scrollIntoView = jest.fn(function (this: Element) {
      scrolledParentId = this.parentElement?.id ?? '';
    });

    expect(
      scrollRenderedContentToLine(container, 'prefix target\ntarget', 2)
    ).toBe(true);
    expect(scrolledParentId).toBe('target');
  });

  it('scrolls to the requested repeated line', () => {
    const container = document.createElement('div');
    container.innerHTML = '<p id="first">target</p><p id="second">target</p>';
    let scrolledParentId = '';
    Element.prototype.scrollIntoView = jest.fn(function (this: Element) {
      scrolledParentId = this.parentElement?.id ?? '';
    });

    expect(scrollRenderedContentToLine(container, 'target\ntarget', 2)).toBe(
      true
    );
    expect(scrolledParentId).toBe('second');
  });
});
