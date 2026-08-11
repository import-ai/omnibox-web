/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import type { Task, TaskStatus, TaskType } from '@/interface';

const fetchResourceTasks = jest.fn();

jest.mock('@/service/resource', () => ({
  fetchResourceTasks: (...args: unknown[]) => fetchResourceTasks(...args),
}));
jest.mock('@/hooks/useApp', () => {
  const listeners: Record<string, ((...args: any[]) => void)[]> = {};
  const app = {
    fire: (event: string, ...args: any[]) =>
      (listeners[event] || []).forEach(handler => handler(...args)),
    on: (event: string, handler: (...args: any[]) => void) => {
      listeners[event] = [...(listeners[event] || []), handler];
      return () => {
        listeners[event] = (listeners[event] || []).filter(
          item => item !== handler
        );
      };
    },
  };
  return { __esModule: true, default: () => app };
});

import { RESOURCE_TASKS_REFRESH_EVENT } from '@/components/attributes/resource-tasks/const';

import useResourceRetryableTasks from './useResourceRetryableTasks';

const app = (
  jest.requireMock('@/hooks/useApp') as {
    default: () => { fire: (event: string, ...args: unknown[]) => void };
  }
).default();

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function task(
  fn: TaskType,
  status: TaskStatus,
  retriedFrom: string | null = null
): Task {
  return {
    id: `task-${fn}-${status}`,
    status,
    function: fn,
    created_at: new Date().toISOString(),
    attrs: null,
    started_at: null,
    ended_at: null,
    canceled_at: null,
    retried_from_task_id: retriedFrom,
  } as Task;
}

describe('useResourceRetryableTasks', () => {
  let container: HTMLDivElement;
  let root: Root;

  function Probe() {
    const { retryable } = useResourceRetryableTasks({
      namespaceId: 'namespace-1',
      resourceId: 'resource-1',
    });
    return <span>{retryable ? 'retryable' : 'nothing'}</span>;
  }

  const render = async (tasks: Task[]) => {
    fetchResourceTasks.mockResolvedValue(tasks);
    await act(async () => {
      root.render(<Probe />);
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it.each<TaskStatus>(['error', 'timeout', 'insufficient_quota', 'canceled'])(
    'reports a %s task as retryable',
    async status => {
      await render([task('file_reader_pdf', status)]);

      expect(container.textContent).toBe('retryable');
    }
  );

  it('reports nothing when every task finished', async () => {
    await render([task('collect_url', 'finished')]);

    expect(container.textContent).toBe('nothing');
  });

  it('drops the retry when a retry elsewhere announces new tasks', async () => {
    const failure = task('collect_url', 'error');
    await render([failure]);
    expect(container.textContent).toBe('retryable');

    fetchResourceTasks.mockResolvedValue([
      failure,
      task('collect_url', 'pending', failure.id),
    ]);
    await act(async () => {
      app.fire(RESOURCE_TASKS_REFRESH_EVENT, 'resource-1');
    });

    expect(container.textContent).toBe('nothing');
  });

  it('ignores a refresh announced for another resource', async () => {
    const failure = task('collect_url', 'error');
    await render([failure]);

    fetchResourceTasks.mockResolvedValue([
      failure,
      task('collect_url', 'pending', failure.id),
    ]);
    await act(async () => {
      app.fire(RESOURCE_TASKS_REFRESH_EVENT, 'another-resource');
    });

    expect(container.textContent).toBe('retryable');
    expect(fetchResourceTasks).toHaveBeenCalledTimes(1);
  });
});
