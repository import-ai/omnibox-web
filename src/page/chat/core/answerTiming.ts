import type { AnswerTiming, MessageAttrs } from './types/conversation';

export function readAnswerTiming(value: unknown): AnswerTiming | undefined {
  if (!value || typeof value !== 'object') return;
  const timing = value as AnswerTiming;
  if (
    timing.version !== 1 ||
    typeof timing.answer_id !== 'string' ||
    !timing.answer_id.trim() ||
    typeof timing.run_id !== 'string' ||
    !timing.run_id.trim() ||
    typeof timing.started_at !== 'string' ||
    !Number.isFinite(Date.parse(timing.started_at)) ||
    !['running', 'paused', 'complete', 'stopped', 'failed'].includes(
      timing.status
    )
  ) {
    return;
  }
  if (
    timing.duration_ms !== undefined &&
    (!Number.isSafeInteger(timing.duration_ms) || timing.duration_ms < 0)
  ) {
    return;
  }
  if (timing.status === 'running' && timing.duration_ms !== undefined) return;
  if (timing.status === 'running' || timing.status === 'paused') {
    return timing.completed_at === undefined ? timing : undefined;
  }
  if (
    typeof timing.completed_at !== 'string' ||
    !Number.isFinite(Date.parse(timing.completed_at)) ||
    Date.parse(timing.completed_at) < Date.parse(timing.started_at) ||
    ((timing.status === 'stopped' || timing.status === 'failed') &&
      timing.duration_ms !== undefined)
  ) {
    return;
  }
  return timing;
}

/** Keep a message bound to one answer/run through stale stream and history replay. */
export function mergeAnswerTiming(
  existing: unknown,
  incoming: unknown
): AnswerTiming | undefined {
  const previous = readAnswerTiming(existing);
  const next = readAnswerTiming(incoming);
  if (!previous) return next;
  if (
    !next ||
    previous.answer_id !== next.answer_id ||
    previous.run_id !== next.run_id ||
    previous.started_at !== next.started_at
  ) {
    return previous;
  }
  if (previous.status === 'running') return next;
  if (
    previous.status === 'paused' &&
    ['complete', 'stopped', 'failed'].includes(next.status)
  ) {
    return next;
  }
  return previous;
}

export function isStaleAnswerTiming(existing: unknown, incoming: unknown) {
  const previous = readAnswerTiming(existing);
  return Boolean(
    previous &&
    previous.status !== 'running' &&
    mergeAnswerTiming(previous, incoming) === previous
  );
}

export function mergeAnswerTimingAttrs(
  existing: MessageAttrs | undefined,
  incoming: MessageAttrs | undefined
): MessageAttrs | undefined {
  if (!existing && !incoming) return;
  return {
    ...existing,
    ...incoming,
    answer_timing: mergeAnswerTiming(
      existing?.answer_timing,
      incoming?.answer_timing
    ),
  };
}
