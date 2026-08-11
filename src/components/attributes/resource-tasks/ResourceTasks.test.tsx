/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import type { Resource, Task, TaskStatus, TaskType } from '@/interface';

const httpGet = jest.fn();
const retryResourceTasks = jest.fn();
const fetchResource = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));
jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => ({ fire: jest.fn() }),
}));
jest.mock('@/lib/request', () => ({
  http: {
    get: (...args: unknown[]) => httpGet(...args),
  },
}));
jest.mock('@/service/resource', () => ({
  retryResourceTasks: (...args: unknown[]) => retryResourceTasks(...args),
  fetchResource: (...args: unknown[]) => fetchResource(...args),
}));
jest.mock('@/const.ts', () => ({ RESOURCE_TASKS_INTERVAL: 60_000 }));
jest.mock('@/components/ui/DropdownMenu', () => {
  const passthrough = ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  );
  return {
    DropdownMenu: passthrough,
    DropdownMenuContent: passthrough,
    DropdownMenuItem: passthrough,
    DropdownMenuTrigger: passthrough,
  };
});

import ResourceTasks from './index';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const resource = { id: 'resource-1', name: 'Blank file' } as Resource;

function task(
  fn: TaskType,
  status: TaskStatus,
  daysAgo = 0,
  retriedFrom: string | null = null
): Task {
  return {
    id: `task-${fn}-${status}-${daysAgo}`,
    status,
    function: fn,
    created_at: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
    attrs: null,
    started_at: null,
    ended_at: null,
    canceled_at: null,
    retried_from_task_id: retriedFrom,
  } as Task;
}

/** A retry of `original`, carrying the pointer the backend stamps on it. */
function retryOf(original: Task, status: TaskStatus, daysAgo = 0): Task {
  return task(original.function, status, daysAgo, original.id);
}

describe('ResourceTasks', () => {
  let container: HTMLDivElement;
  let root: Root;

  const render = async (tasks: Task[]) => {
    httpGet.mockResolvedValue(tasks);
    await act(async () => {
      root.render(
        <ResourceTasks
          resource={resource}
          namespaceId="namespace-1"
          onResource={jest.fn()}
        />
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

  it('renders the failed group and a retry button for a stale failure', async () => {
    await render([task('file_reader_pdf', 'insufficient_quota', 30)]);

    expect(container.textContent).toContain('tasks.status_label_failed');
    expect(container.textContent).toContain('common.retry');
  });

  it('renders the canceled group and a retry button for a canceled task', async () => {
    await render([task('file_reader_pdf', 'canceled', 30)]);

    expect(container.textContent).toContain('tasks.status_label_canceled');
    expect(container.textContent).not.toContain('tasks.status_label_failed');
    expect(container.textContent).toContain('common.retry');
  });

  it('offers a retry for a canceled task next to a successful parse', async () => {
    await render([
      task('collect_url', 'finished', 1),
      task('extract_tags', 'canceled', 1),
    ]);

    expect(container.textContent).toContain('tasks.status_label_canceled');
    expect(container.textContent).toContain('tasks.functions.extract_tags');
    expect(container.textContent).toContain('common.retry');
  });

  it('hides the retry button and the superseded cancellation while its retry runs', async () => {
    const canceled = task('file_reader_pdf', 'canceled', 1);
    await render([canceled, retryOf(canceled, 'running')]);

    expect(container.textContent).toContain('tasks.status_label_running');
    expect(container.textContent).not.toContain('tasks.status_label_canceled');
    expect(container.textContent).not.toContain('common.retry');
  });

  it('renders nothing once the retry of a canceled task finished', async () => {
    const canceled = task('file_reader_text', 'canceled', 30);
    await render([canceled, retryOf(canceled, 'finished')]);

    expect(container.textContent).toBe('');
  });

  it('renders nothing when everything finished', async () => {
    await render([
      task('file_reader_text', 'finished'),
      task('upsert_index', 'finished'),
    ]);

    expect(container.textContent).toBe('');
  });

  it('hides the retry button and the superseded failure while the retry runs', async () => {
    const failure = task('file_reader_pdf', 'error', 1);
    await render([failure, retryOf(failure, 'running')]);

    expect(container.textContent).toContain('tasks.status_label_running');
    expect(container.textContent).not.toContain('tasks.status_label_failed');
    expect(container.textContent).not.toContain('common.retry');
  });

  it('shows the pending retry instead of the failure it replaced', async () => {
    const failure = task('file_reader_text', 'insufficient_quota', 30);
    await render([failure, retryOf(failure, 'pending')]);

    expect(container.textContent).toContain('tasks.status_label_pending');
    expect(container.textContent).not.toContain('tasks.status_label_failed');
  });

  it('renders nothing once the retry finished successfully', async () => {
    const failure = task('file_reader_text', 'insufficient_quota', 30);
    await render([failure, retryOf(failure, 'finished')]);

    expect(container.textContent).toBe('');
  });

  it('shows only the newest failure when the retry failed again', async () => {
    const first = task('file_reader_pdf', 'error', 30);
    const second = retryOf(first, 'timeout', 10);
    await render([first, second, retryOf(second, 'insufficient_quota')]);

    expect(container.textContent).toContain('tasks.status_label_failed');
    expect(container.textContent).toContain('common.retry');
    expect(
      container.textContent?.match(/tasks\.functions\.file_reader_pdf/g)
    ).toHaveLength(1);
  });

  it('keeps a failure that was never retried visible under a newer same-function task', async () => {
    await render([
      task('file_reader_pdf', 'error', 30),
      task('file_reader_pdf', 'finished', 1),
    ]);

    expect(container.textContent).toContain('tasks.status_label_failed');
    expect(container.textContent).toContain('common.retry');
  });

  it('offers a retry for a failed non-parse task', async () => {
    await render([
      task('collect_url', 'finished', 1),
      task('extract_tags', 'error', 1),
    ]);

    expect(container.textContent).toContain('tasks.status_label_failed');
    expect(container.textContent).toContain('tasks.functions.extract_tags');
    expect(container.textContent).toContain('common.retry');
  });

  it('posts a retry and refreshes the resource', async () => {
    await render([task('collect_url', 'error', 3)]);
    retryResourceTasks.mockResolvedValue([{ id: 'task-new' }]);
    fetchResource.mockResolvedValue(resource);

    const retryButton = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent?.includes('common.retry')
    );
    await act(async () => {
      retryButton?.click();
    });

    expect(retryResourceTasks).toHaveBeenCalledWith(
      'namespace-1',
      'resource-1'
    );
    expect(fetchResource).toHaveBeenCalledWith('namespace-1', 'resource-1');
  });
});
