import { trimIncompletedCitation } from './utils';

describe('cleanIncompletedCitation', () => {
  it('removes incomplete [ at the end', () => {
    expect(trimIncompletedCitation('hello [')).toBe('hello ');
    expect(trimIncompletedCitation('test [')).toBe('test ');
  });

  it('removes incomplete [[ at the end', () => {
    expect(trimIncompletedCitation('hello [[')).toBe('hello ');
    expect(trimIncompletedCitation('test [[')).toBe('test ');
  });

  it('removes incomplete [[1 at the end', () => {
    expect(trimIncompletedCitation('foo [[1')).toBe('foo ');
    expect(trimIncompletedCitation('bar [[12')).toBe('bar ');
  });

  it('removes incomplete [[1] at the end', () => {
    expect(trimIncompletedCitation('baz [[1]')).toBe('baz ');
    expect(trimIncompletedCitation('qux [[12]')).toBe('qux ');
  });

  it('does not remove complete citations', () => {
    expect(trimIncompletedCitation('done [[1]]')).toBe('done [[1]]');
    expect(trimIncompletedCitation('ok [[12]]')).toBe('ok [[12]]');
  });

  it('returns unchanged text if no incomplete citation', () => {
    expect(trimIncompletedCitation('no citation here')).toBe(
      'no citation here'
    );
  });
});
