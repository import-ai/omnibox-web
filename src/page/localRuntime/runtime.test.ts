import { mergeEvents, terminal } from './runtime';
jest.mock('@/lib/request', () => ({ http: {} }));
it('merges replayed output once and preserves sequence ordering', () => {
  expect(
    mergeEvents(
      [{ sequence: 2, kind: 'stdout', data: 'b' }],
      [
        { sequence: 1, kind: 'stdout', data: 'a' },
        { sequence: 2, kind: 'stdout', data: 'b' },
      ]
    )
      .map(e => e.data)
      .join('')
  ).toBe('ab');
  expect(terminal.has('cancel_requested')).toBe(false);
  expect(terminal.has('unknown')).toBe(true);
});
