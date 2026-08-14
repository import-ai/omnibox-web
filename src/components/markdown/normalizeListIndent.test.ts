import { normalizeListIndentForLute } from './normalizeListIndent';

describe('normalizeListIndentForLute', () => {
  it('expands pure 2-space nested lists to 4 spaces per level', () => {
    const input = ['- A', '  - A.1', '- B', '  - B.1'].join('\n');
    const expected = ['- A', '    - A.1', '- B', '    - B.1'].join('\n');
    expect(normalizeListIndentForLute(input)).toBe(expected);
  });

  it('does not rewrite pure 4-space nested lists', () => {
    const input = ['- A', '    - A.1', '- B', '    - B.1'].join('\n');
    expect(normalizeListIndentForLute(input)).toBe(input);
  });

  it('keeps neighboring 4-space blocks intact when another block uses 2 spaces', () => {
    const input = ['- A', '  - A.1', '', '- B', '    - B.1'].join('\n');
    const expected = ['- A', '    - A.1', '', '- B', '    - B.1'].join('\n');
    expect(normalizeListIndentForLute(input)).toBe(expected);
  });

  it('expands ordered 2-space nests and leaves continuation lines alone', () => {
    const input = [
      '1. parent',
      '  1. child',
      '     still child',
      '2. next',
    ].join('\n');
    const expected = [
      '1. parent',
      '    1. child',
      '     still child',
      '2. next',
    ].join('\n');
    expect(normalizeListIndentForLute(input)).toBe(expected);
  });

  it('does not rewrite list-like text inside fenced code blocks', () => {
    const input = ['```', '  - not a list', '```', '- A', '  - B'].join('\n');
    const expected = ['```', '  - not a list', '```', '- A', '    - B'].join(
      '\n'
    );
    expect(normalizeListIndentForLute(input)).toBe(expected);
  });

  it('leaves odd-indent list items unchanged', () => {
    const input = ['- A', '   - three spaces'].join('\n');
    expect(normalizeListIndentForLute(input)).toBe(input);
  });
});
