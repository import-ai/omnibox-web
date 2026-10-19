/** @jest-environment jsdom */
import { parseScrollToLine } from './scrollToLine';

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
