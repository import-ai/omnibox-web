import { Task, TaskStatus, TaskType } from '@/interface';

import { getFailedTasks, getSupersededTaskIds, hasFailedTasks } from './utils';

let seq = 0;

function task(
  fn: TaskType,
  status: TaskStatus,
  minutesAgo = ++seq,
  retriedFrom: string | null = null
): Task {
  return {
    id: `task-${fn}-${status}-${minutesAgo}`,
    status,
    function: fn,
    created_at: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    attrs: null,
    started_at: null,
    ended_at: null,
    canceled_at: null,
    retried_from_task_id: retriedFrom,
  } as Task;
}

/** A retry of `original`, carrying the pointer the backend stamps on it. */
function retryOf(original: Task, status: TaskStatus, minutesAgo = 1): Task {
  return task(original.function, status, minutesAgo, original.id);
}

describe('getSupersededTaskIds', () => {
  it('collects the ids every retry points at', () => {
    const first = task('file_reader_pdf', 'error', 20);
    const second = retryOf(first, 'timeout', 10);

    expect(
      getSupersededTaskIds([first, second, retryOf(second, 'pending')])
    ).toEqual(new Set([first.id, second.id]));
  });

  it('is empty when nothing was ever retried', () => {
    expect(
      getSupersededTaskIds([
        task('file_reader_pdf', 'error', 10),
        task('collect_url', 'finished', 1),
      ])
    ).toEqual(new Set());
  });
});

describe('hasFailedTasks', () => {
  it.each<TaskStatus>(['error', 'timeout', 'insufficient_quota'])(
    'reports a failure for a %s task',
    status => {
      expect(hasFailedTasks([task('file_reader_pdf', status, 1)])).toBe(true);
    }
  );

  it('reports failures of non-parse tasks too', () => {
    expect(hasFailedTasks([task('upsert_index', 'error', 1)])).toBe(true);
    expect(hasFailedTasks([task('extract_tags', 'timeout', 1)])).toBe(true);
  });

  it('ignores a canceled task', () => {
    expect(hasFailedTasks([task('delete_index', 'canceled', 1)])).toBe(false);
  });

  it('reports no failure once the failure has been retried', () => {
    const failure = task('file_reader_pdf', 'error', 10);

    expect(hasFailedTasks([failure, retryOf(failure, 'pending')])).toBe(false);
  });

  it('reports a failure again when the retry itself failed', () => {
    const failure = task('file_reader_pdf', 'error', 10);

    expect(hasFailedTasks([failure, retryOf(failure, 'timeout')])).toBe(true);
  });

  it('reports no failure without any task', () => {
    expect(hasFailedTasks([])).toBe(false);
  });
});

describe('getFailedTasks', () => {
  it('keeps only failed statuses', () => {
    const failed = getFailedTasks([
      task('file_reader_pdf', 'insufficient_quota', 3),
      task('upsert_index', 'finished', 2),
      task('delete_index', 'canceled', 1),
      task('extract_tags', 'timeout', 4),
    ]);

    expect(failed.map(item => item.status)).toEqual([
      'insufficient_quota',
      'timeout',
    ]);
  });

  it('drops a failure that a retry points at', () => {
    const failure = task('file_reader_pdf', 'error', 10);

    expect(getFailedTasks([failure, retryOf(failure, 'pending')])).toEqual([]);
  });

  it('keeps a failure that was never retried, whatever ran afterwards', () => {
    const failure = task('file_reader_pdf', 'error', 10);
    const unrelated = task('file_reader_pdf', 'finished', 1);

    // Same function, newer, successful: the timestamp heuristic used to hide
    // the failure here. Nothing points at it, so it stays visible.
    expect(getFailedTasks([failure, unrelated])).toEqual([failure]);
  });

  it('keeps a parse failure when an unrelated parse function ran later', () => {
    const failure = task('file_reader_pdf', 'error', 10);
    const unrelated = task('collect_url', 'running', 1);

    expect(getFailedTasks([failure, unrelated])).toEqual([failure]);
  });

  it('keeps a failure when the newer task is an unrelated non-parse function', () => {
    const failure = task('file_reader_pdf', 'error', 10);

    expect(
      getFailedTasks([
        failure,
        task('upsert_index', 'finished', 1),
        task('extract_tags', 'running', 2),
      ])
    ).toEqual([failure]);
  });

  it('keeps only the newest failure along a chain of retries', () => {
    const first = task('file_reader_pdf', 'error', 20);
    const second = retryOf(first, 'timeout', 10);
    const third = retryOf(second, 'insufficient_quota', 1);

    expect(getFailedTasks([first, second, third])).toEqual([third]);
  });

  it('never lets a task supersede itself', () => {
    const only = task('file_reader_text', 'insufficient_quota', 5);

    expect(getFailedTasks([only])).toEqual([only]);
  });

  it('keeps a non-parse failure that no retry replaced', () => {
    const failed = getFailedTasks([
      task('collect_url', 'finished', 10),
      task('extract_tags', 'error', 1),
    ]);

    expect(failed.map(item => item.function)).toEqual(['extract_tags']);
  });

  it('resolves supersession against the full task list, not the filtered one', () => {
    const stale = task('file_reader_pdf', 'error', 10);
    const retry = retryOf(stale, 'pending');

    expect(getFailedTasks([stale], [stale, retry])).toEqual([]);
  });
});
