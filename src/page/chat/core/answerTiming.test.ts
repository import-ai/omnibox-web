import {
  isStaleAnswerTiming,
  mergeAnswerTiming,
  mergeAnswerTimingAttrs,
  readAnswerTiming,
} from './answerTiming';
import type { AnswerTiming } from './types/conversation';

function timing(
  status: AnswerTiming['status'],
  extra: Partial<AnswerTiming> = {}
): AnswerTiming {
  return {
    version: 1,
    answer_id: 'answer',
    run_id: 'run',
    started_at: '2026-11-09T00:00:00Z',
    status,
    ...(['complete', 'stopped', 'failed'].includes(status)
      ? { completed_at: '2026-11-09T00:00:10Z' }
      : {}),
    ...extra,
  };
}

test.each(['running', 'paused', 'complete', 'stopped', 'failed'] as const)(
  'reads a %s snapshot with unknown cumulative duration',
  status => {
    const snapshot = timing(status);
    expect(readAnswerTiming(snapshot)).toBe(snapshot);
  }
);

test('accepts cumulative active duration without using wall time or requiring approval wait', () => {
  const snapshot = timing('complete', { duration_ms: 2300 });
  expect(readAnswerTiming(snapshot)).toBe(snapshot);
  expect(
    readAnswerTiming(timing('paused', { duration_ms: 2300 }))
  ).toBeDefined();
});

test.each([
  { version: 2 },
  { answer_id: '' },
  { run_id: ' ' },
  { started_at: 'invalid' },
  { completed_at: 'invalid' },
  { completed_at: '2026-11-08T00:00:00Z' },
  { duration_ms: -1 },
  { duration_ms: NaN },
  { duration_ms: Infinity },
  { duration_ms: Number.MAX_SAFE_INTEGER + 1 },
  { duration_ms: 1.5 },
  { status: 'completed' },
])('does not let malformed metadata overwrite a bound answer %#', invalid => {
  const previous = timing('running');
  const malformed = { ...timing('complete'), ...invalid };
  expect(readAnswerTiming(malformed)).toBeUndefined();
  expect(mergeAnswerTiming(previous, malformed)).toBe(previous);
});

test.each(['stopped', 'failed'] as const)(
  'rejects completed duration on a %s snapshot',
  status => {
    expect(
      readAnswerTiming(timing(status, { duration_ms: 2300 }))
    ).toBeUndefined();
  }
);

test.each(['running', 'paused'] as const)(
  'rejects completion timestamps on a %s snapshot',
  status => {
    expect(
      readAnswerTiming(timing(status, { completed_at: '2026-11-09T00:00:10Z' }))
    ).toBeUndefined();
  }
);

test.each(['complete', 'stopped', 'failed'] as const)(
  'allows paused timing to advance to %s',
  status => {
    const previous = timing('paused', { duration_ms: 2300 });
    const terminal = timing(status);
    expect(mergeAnswerTiming(previous, terminal)).toBe(terminal);
    expect(isStaleAnswerTiming(previous, terminal)).toBe(false);
  }
);

test.each(['complete', 'stopped', 'failed'] as const)(
  'keeps %s immutable through another terminal snapshot',
  status => {
    const previous = timing(status);
    expect(mergeAnswerTiming(previous, timing('complete'))).toBe(previous);
    expect(isStaleAnswerTiming(previous, timing('running'))).toBe(true);
  }
);

test('keeps timing while independently merging citations and other message metadata', () => {
  const previous = timing('complete', { duration_ms: 2300 });
  const existing = { answer_timing: previous, metrics: { tokens: 7 } };
  const incoming = {
    answer_timing: timing('running'),
    stream_event_id: '12-3',
  };
  expect(mergeAnswerTimingAttrs(existing, incoming)).toEqual({
    answer_timing: previous,
    metrics: { tokens: 7 },
    stream_event_id: '12-3',
  });
  expect(existing.answer_timing).toBe(previous);
  expect(incoming.answer_timing.status).toBe('running');
});

test('rejects running snapshots that already contain accumulated duration', () => {
  expect(
    readAnswerTiming(timing('running', { duration_ms: 2300 }))
  ).toBeUndefined();
});
