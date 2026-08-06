/**
 * @jest-environment jsdom
 */
import {
  escapeRegExp,
  findFirstSearchMatchElement,
  highlightSearchText,
} from './searchHighlight';

describe('escapeRegExp', () => {
  it('escapes regex metacharacters', () => {
    expect(escapeRegExp('test(')).toBe('test\\(');
    expect(escapeRegExp('C++')).toBe('C\\+\\+');
    expect(escapeRegExp('a.*b')).toBe('a\\.\\*b');
    expect(escapeRegExp('[foo]')).toBe('\\[foo\\]');
  });
});

function expectSearchMark(root: HTMLElement, text: string) {
  const mark = root.querySelector(
    'mark.search-query-mark'
  ) as HTMLElement | null;
  expect(mark).not.toBeNull();
  expect(mark?.className).toBe('search-query-mark');
  expect(mark?.textContent).toBe(text);
}

describe('highlightSearchText', () => {
  it('highlights a plain match', () => {
    const root = document.createElement('div');
    root.textContent = 'hello world';

    expect(highlightSearchText(root, 'world')).toBe(1);
    expectSearchMark(root, 'world');
  });

  it('treats regex metacharacters as literals', () => {
    const root = document.createElement('div');
    root.textContent = 'hello test(abc) world';

    expect(() => highlightSearchText(root, 'test(')).not.toThrow();
    expectSearchMark(root, 'test(');
    expect(root.textContent).toBe('hello test(abc) world');
  });

  it('does not nest marks when run twice', () => {
    const root = document.createElement('div');
    root.textContent = 'hello world';

    highlightSearchText(root, 'world');
    highlightSearchText(root, 'world');

    expect(root.querySelectorAll('mark.search-query-mark')).toHaveLength(1);
    expectSearchMark(root, 'world');
  });

  it('is case-insensitive', () => {
    const root = document.createElement('div');
    root.textContent = 'Hello WORLD';

    highlightSearchText(root, 'world');
    expectSearchMark(root, 'WORLD');
  });
});

describe('findFirstSearchMatchElement', () => {
  it('returns an existing mark when present', () => {
    const root = document.createElement('div');
    root.innerHTML = 'x <mark class="search-query-mark">hit</mark> y';

    const el = findFirstSearchMatchElement(root, 'hit');
    expect(el?.className).toBe('search-query-mark');
  });
});
