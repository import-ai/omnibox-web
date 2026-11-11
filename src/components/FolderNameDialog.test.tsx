/** @jest-environment jsdom */

import {
  act,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
} from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { behavior, configureBehaviorTracking } from '@/lib/behaviorTracking';

import { FolderNameDialog } from './FolderNameDialog';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/components/Button', () => ({
  Button: ({
    children,
    loading,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) => (
    <button data-loading={loading} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/omnibox/Dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? children : null,
  DialogContent: ({
    children,
    ref,
  }: {
    children: ReactNode;
    ref?: import('react').Ref<HTMLDivElement>;
  }) => (
    <div ref={ref} data-editor>
      {children}
    </div>
  ),
  DialogFooter: ({ children }: { children: ReactNode }) => children,
  DialogHeader: ({ children }: { children: ReactNode }) => children,
  DialogTitle: ({ children }: { children: ReactNode }) => children,
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

jest.mock('@/components/ui/Label', () => ({
  Label: (props: LabelHTMLAttributes<HTMLLabelElement>) => <label {...props} />,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe('FolderNameDialog', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('trims the name and prevents duplicate submissions', async () => {
    const request = deferred<void>();
    const onConfirm = jest.fn(() => request.promise);
    const onOpenChange = jest.fn();

    await act(async () =>
      root.render(
        <FolderNameDialog
          open
          initialName="  Folder name  "
          onOpenChange={onOpenChange}
          onConfirm={onConfirm}
        />
      )
    );

    const input = container.querySelector('input')!;
    const buttons = container.querySelectorAll('button');
    const cancelButton = buttons[0];
    const confirmButton = buttons[1];

    await act(async () => confirmButton.click());
    await act(async () => confirmButton.click());

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith('Folder name');
    expect(input.disabled).toBe(true);
    expect(cancelButton.disabled).toBe(true);
    expect(confirmButton.disabled).toBe(true);

    await act(async () => {
      request.resolve();
      await request.promise;
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('keeps the dialog editable when submission fails', async () => {
    const onConfirm = jest.fn(() => Promise.reject(new Error('failed')));
    const onOpenChange = jest.fn();

    await act(async () =>
      root.render(
        <FolderNameDialog
          open
          initialName="Folder name"
          onOpenChange={onOpenChange}
          onConfirm={onConfirm}
        />
      )
    );

    const input = container.querySelector('input')!;
    const confirmButton = container.querySelectorAll('button')[1];

    await act(async () => confirmButton.click());

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(input.value).toBe('Folder name');
    expect(input.disabled).toBe(false);
    expect(confirmButton.disabled).toBe(false);
  });
});

it('records input and dwell on canceled folder edits, including repeated visits and an untouched visit', async () => {
  jest.useFakeTimers({ now: Date.parse('2026-11-11T04:00:00Z') });
  localStorage.setItem('uid', 'folder-editor');
  jest.spyOn(document, 'hasFocus').mockReturnValue(true);
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: 'visible',
  });
  jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 100,
    bottom: 100,
    width: 100,
    height: 100,
    toJSON() {},
  });
  const events: { name: string; props: Record<string, unknown> }[] = [];
  configureBehaviorTracking(true, async (name, props) => {
    events.push({ name, props });
  });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const previousElementFromPoint = document.elementFromPoint;
  document.elementFromPoint = () => container.querySelector('input');
  const root = createRoot(container);
  const onConfirm = jest.fn(async () => {});
  try {
    for (let visit = 0; visit < 3; visit++) {
      const props = {
        open: true,
        initialName: 'folder',
        resourceId: 'folder-edit-regression',
        onConfirm,
        onOpenChange: jest.fn(),
      };
      await act(async () => root.render(<FolderNameDialog {...props} />));
      if (visit < 2)
        await act(async () => {
          const input = container.querySelector('input')!;
          Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            'value'
          )!.set!.call(input, 'renamed');
          input.dispatchEvent(new Event('input', { bubbles: true }));
        });
      await act(async () => jest.advanceTimersByTime(4000));
      await act(async () => container.querySelector('button')!.click());
      expect(props.onOpenChange).toHaveBeenCalledWith(false);
      await act(async () =>
        root.render(<FolderNameDialog {...props} open={false} />)
      );
      await act(async () => jest.runAllTicks());
    }
    expect(onConfirm).not.toHaveBeenCalled();
    expect(events.filter(e => e.name === 'editor_input')).toHaveLength(2);
    expect(events.filter(e => e.name === 'core_action_start')).toHaveLength(1);
    const dwell = events.filter(
      e => e.name === 'active_duration' && e.props.scope === 'editor'
    );
    expect(dwell.map(e => e.props.has_input)).toEqual([true, true, false]);
    expect(dwell.map(e => e.props.duration_ms)).toEqual([4000, 4000, 4000]);
    const before = events.length;
    await act(async () =>
      root.render(
        <FolderNameDialog
          open
          initialName=""
          onConfirm={onConfirm}
          onOpenChange={() => {}}
        />
      )
    );
    await act(async () => jest.advanceTimersByTime(1000));
    await act(async () =>
      root.render(
        <FolderNameDialog
          open={false}
          onConfirm={onConfirm}
          onOpenChange={() => {}}
        />
      )
    );
    expect(events).toHaveLength(before);
  } finally {
    await act(async () => root.unmount());
    configureBehaviorTracking(false, async () => {});
    behavior.visits.forEach(visit => visit.discard());
    document.elementFromPoint = previousElementFromPoint;
    container.remove();
    jest.restoreAllMocks();
    jest.useRealTimers();
  }
});
