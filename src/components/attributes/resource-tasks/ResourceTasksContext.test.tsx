/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import type { Task, TaskStatus, TaskType } from '@/interface';

const fetchResourceTasks = jest.fn();
const retryResourceTasks = jest.fn();
const fetchResource = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
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
jest.mock('@/service/resource', () => ({
  fetchResourceTasks: (...args: unknown[]) => fetchResourceTasks(...args),
  retryResourceTasks: (...args: unknown[]) => retryResourceTasks(...args),
  fetchResource: (...args: unknown[]) => fetchResource(...args),
}));
jest.mock('@/const.ts', () => ({ RESOURCE_TASKS_INTERVAL: 60_000 }));

import { RESOURCE_TASKS_REFRESH_EVENT } from './const';
import {
  ResourceTasksProvider,
  useResourceTasks,
} from './ResourceTasksContext';

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

function Probe() {
  const { hasRetryable, loading } = useResourceTasks();
  if (loading) {
    return <span>loading</span>;
  }
  return <span>{hasRetryable ? 'retryable' : 'nothing'}</span>;
}

describe('ResourceTasksProvider', () => {
  let container: HTMLDivElement;
  let root: Root;

  const render = async (
    tasks: Task[],
    resourceType: string | null = 'file'
  ) => {
    fetchResourceTasks.mockResolvedValue(tasks);
    await act(async () => {
      root.render(
        <ResourceTasksProvider
          namespaceId="namespace-1"
          resourceId="resource-1"
          resourceType={resourceType}
        >
          <Probe />
        </ResourceTasksProvider>
      );
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

  it('disables tracking for non-file/link resources', async () => {
    fetchResourceTasks.mockResolvedValue([task('file_reader_pdf', 'error')]);
    await act(async () => {
      root.render(
        <ResourceTasksProvider
          namespaceId="namespace-1"
          resourceId="resource-1"
          resourceType="folder"
        >
          <Probe />
        </ResourceTasksProvider>
      );
    });

    expect(container.textContent).toBe('nothing');
    expect(fetchResourceTasks).not.toHaveBeenCalled();
  });

  it('drops the retry when a retry supersedes the failure', async () => {
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
});
