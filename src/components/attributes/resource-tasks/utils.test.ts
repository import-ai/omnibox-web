import { Task, TaskStatus, TaskType } from '@/interface';

import {
  getCanceledTasks,
  getFailedTasks,
  getRetryableTasks,
  getSupersededTaskIds,
  hasRetryableTasks,
} from './utils';

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

describe('hasRetryableTasks', () => {
  it.each<TaskStatus>(['error', 'timeout', 'insufficient_quota', 'canceled'])(
    'reports a %s task as retryable',
    status => {
      expect(hasRetryableTasks([task('file_reader_pdf', status, 1)])).toBe(
        true
      );
    }
  );

  it('reports failures of non-parse tasks too', () => {
    expect(hasRetryableTasks([task('upsert_index', 'error', 1)])).toBe(true);
    expect(hasRetryableTasks([task('extract_tags', 'timeout', 1)])).toBe(true);
  });

  it('reports a canceled non-parse task too', () => {
    expect(hasRetryableTasks([task('delete_index', 'canceled', 1)])).toBe(true);
  });

  it('reports nothing once the failure has been retried', () => {
    const failure = task('file_reader_pdf', 'error', 10);

    expect(hasRetryableTasks([failure, retryOf(failure, 'pending')])).toBe(
      false
    );
  });

  it('reports nothing once the cancellation has been retried', () => {
    const canceled = task('file_reader_pdf', 'canceled', 10);

    expect(hasRetryableTasks([canceled, retryOf(canceled, 'running')])).toBe(
      false
    );
  });

  it('reports a failure again when the retry itself failed', () => {
    const failure = task('file_reader_pdf', 'error', 10);

    expect(hasRetryableTasks([failure, retryOf(failure, 'timeout')])).toBe(
      true
    );
  });

  it('reports a retryable task again when the retry was canceled', () => {
    const failure = task('file_reader_pdf', 'error', 10);

    expect(hasRetryableTasks([failure, retryOf(failure, 'canceled')])).toBe(
      true
    );
  });

  it('reports nothing without any task', () => {
    expect(hasRetryableTasks([])).toBe(false);
  });
});

describe('getRetryableTasks', () => {
  it('keeps failed and canceled tasks and drops the rest', () => {
    const retryable = getRetryableTasks([
      task('file_reader_pdf', 'insufficient_quota', 4),
      task('upsert_index', 'finished', 3),
      task('delete_index', 'canceled', 2),
      task('extract_tags', 'running', 1),
    ]);

    expect(retryable.map(item => item.status)).toEqual([
      'insufficient_quota',
      'canceled',
    ]);
  });

  it('drops a cancellation that a retry points at', () => {
    const canceled = task('collect_url', 'canceled', 10);

    expect(getRetryableTasks([canceled, retryOf(canceled, 'pending')])).toEqual(
      []
    );
  });
});

describe('getCanceledTasks', () => {
  it('keeps only cancellations no retry replaced', () => {
    const canceled = task('extract_tags', 'canceled', 10);
    const retried = task('upsert_index', 'canceled', 9);

    expect(
      getCanceledTasks([
        canceled,
        retried,
        task('file_reader_pdf', 'error', 8),
        retryOf(retried, 'pending'),
      ])
    ).toEqual([canceled]);
  });
});

describe('getFailedTasks', () => {
  it('keeps only failed statuses, leaving cancellations to their own group', () => {
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
