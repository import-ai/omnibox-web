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

import { FolderNameDialog } from './FolderNameDialog';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/components/button', () => ({
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

jest.mock('@/components/ui/Dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? children : null,
  DialogContent: ({ children }: { children: ReactNode }) => children,
  DialogFooter: ({ children }: { children: ReactNode }) => children,
  DialogHeader: ({ children }: { children: ReactNode }) => children,
  DialogTitle: ({ children }: { children: ReactNode }) => children,
}));

jest.mock('@/components/ui/Input', () => ({
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
