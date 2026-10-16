/**
 * @jest-environment jsdom
 */
import { escapeRegExp, splitSearchText } from './searchHighlight';

describe('escapeRegExp', () => {
  it('escapes regex metacharacters', () => {
    expect(escapeRegExp('test(')).toBe('test\\(');
    expect(escapeRegExp('C++')).toBe('C\\+\\+');
    expect(escapeRegExp('a.*b')).toBe('a\\.\\*b');
    expect(escapeRegExp('[foo]')).toBe('\\[foo\\]');
  });
});

describe('splitSearchText', () => {
  it('splits every case-insensitive title match', () => {
    expect(splitSearchText('Hello hello world', 'hello')).toEqual([
      { match: true, text: 'Hello' },
      { match: false, text: ' ' },
      { match: true, text: 'hello' },
      { match: false, text: ' world' },
    ]);
  });

  it('returns plain text when the query is empty or absent', () => {
    expect(splitSearchText('Resource title', ' ')).toEqual([
      { match: false, text: 'Resource title' },
    ]);
    expect(splitSearchText('Resource title', 'missing')).toEqual([
      { match: false, text: 'Resource title' },
    ]);
  });
});
