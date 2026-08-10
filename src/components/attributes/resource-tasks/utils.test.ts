import { Task, TaskStatus, TaskType } from '@/interface';

import { getFailedTasks, hasFailedParse } from './utils';

let seq = 0;

function task(fn: TaskType, status: TaskStatus, minutesAgo = ++seq): Task {
  return {
    id: `task-${fn}-${status}-${minutesAgo}`,
    status,
    function: fn,
    created_at: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    attrs: null,
    started_at: null,
    ended_at: null,
    canceled_at: null,
  } as Task;
}

describe('hasFailedParse', () => {
  it.each<TaskStatus>(['error', 'timeout', 'insufficient_quota'])(
    'reports a failure when the latest parse task is %s',
    status => {
      expect(hasFailedParse([task('file_reader_pdf', status, 1)])).toBe(true);
    }
  );

  it('ignores failures of non-parse tasks', () => {
    expect(hasFailedParse([task('upsert_index', 'error', 1)])).toBe(false);
    expect(hasFailedParse([task('extract_tags', 'error', 1)])).toBe(false);
  });

  it('reports no failure while a newer parse task is still running', () => {
    expect(
      hasFailedParse([
        task('file_reader_pdf', 'error', 10),
        task('file_reader_pdf', 'running', 1),
      ])
    ).toBe(false);
  });

  it('reports no failure once a newer parse task finished', () => {
    expect(
      hasFailedParse([
        task('collect_url', 'error', 10),
        task('collect_url', 'finished', 1),
      ])
    ).toBe(false);
  });

  it('reports a failure when the newest parse task failed after an earlier success', () => {
    expect(
      hasFailedParse([
        task('collect_url', 'finished', 10),
        task('collect_url', 'insufficient_quota', 1),
      ])
    ).toBe(true);
  });

  it('reports no failure without any parse task', () => {
    expect(hasFailedParse([])).toBe(false);
  });
});

describe('getFailedTasks', () => {
  it('keeps only failed statuses', () => {
    const failed = getFailedTasks([
      task('file_reader_pdf', 'insufficient_quota', 3),
      task('upsert_index', 'finished', 2),
      task('collect_url', 'canceled', 1),
      task('extract_tags', 'timeout', 4),
    ]);

    expect(failed.map(item => item.status)).toEqual([
      'insufficient_quota',
      'timeout',
    ]);
  });
});
