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

describe('highlightSearchText', () => {
  it('highlights a plain match', () => {
    const root = document.createElement('div');
    root.textContent = 'hello world';

    expect(highlightSearchText(root, 'world')).toBe(1);
    expect(root.innerHTML).toBe(
      'hello <mark class="search-query-mark">world</mark>'
    );
  });

  it('treats regex metacharacters as literals', () => {
    const root = document.createElement('div');
    root.textContent = 'hello test(abc) world';

    expect(() => highlightSearchText(root, 'test(')).not.toThrow();
    expect(root.innerHTML).toBe(
      'hello <mark class="search-query-mark">test(</mark>abc) world'
    );
  });

  it('does not nest marks when run twice', () => {
    const root = document.createElement('div');
    root.textContent = 'hello world';

    highlightSearchText(root, 'world');
    highlightSearchText(root, 'world');

    expect(root.querySelectorAll('mark.search-query-mark')).toHaveLength(1);
    expect(root.innerHTML).toBe(
      'hello <mark class="search-query-mark">world</mark>'
    );
  });

  it('is case-insensitive', () => {
    const root = document.createElement('div');
    root.textContent = 'Hello WORLD';

    highlightSearchText(root, 'world');
    expect(root.innerHTML).toBe(
      'Hello <mark class="search-query-mark">WORLD</mark>'
    );
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
