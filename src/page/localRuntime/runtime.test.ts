import { http } from '@/lib/request';

import { mergeEvents, runtimeApi, terminal } from './runtime';
jest.mock('@/lib/request', () => ({ http: { post: jest.fn() } }));

it('keeps authentication redirects when execution actions own error display', () => {
  runtimeApi.decide('execution', 'approve');
  runtimeApi.cancel('execution');
  expect(http.post).toHaveBeenCalledWith(
    '/local-executions/execution/decision',
    { decision: 'approve' },
    { mute: true, redirectOnUnauthorized: true }
  );
  expect(http.post).toHaveBeenCalledWith(
    '/local-executions/execution/cancel',
    undefined,
    { mute: true, redirectOnUnauthorized: true }
  );
});
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
