/** @jest-environment jsdom */

import {
  act,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { AddLinkDialog } from './AddLinkDialog';

const toastError = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => toastError(...args) },
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

jest.mock('@/components/omnibox/IconButton', () => ({
  IconButton: ({
    children,
    label,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & { label?: string }) => (
    <button aria-label={label} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/omnibox/Dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? children : null,
  DialogContent: ({ children }: { children: ReactNode }) => children,
  DialogFooter: ({ children }: { children: ReactNode }) => children,
  DialogHeader: ({ children }: { children: ReactNode }) => children,
  DialogTitle: ({ children }: { children: ReactNode }) => children,
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
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

function setInputValue(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value'
  )!.set!.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('AddLinkDialog', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    toastError.mockClear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('autofocuses the input and greys save until a link is entered', async () => {
    await act(async () =>
      root.render(
        <AddLinkDialog open onOpenChange={jest.fn()} onConfirm={jest.fn()} />
      )
    );

    const saveButton = [...container.querySelectorAll('button')].find(
      button => button.textContent === 'chat.home.upload.save'
    )!;

    expect(saveButton.disabled).toBe(true);
    expect(saveButton.parentElement?.className).toContain('cursor-not-allowed');
    expect(container.querySelector('button[aria-label="delete"]')).toBeNull();
  });

  it('shows a delete control and closes without a prompt when cancelled', async () => {
    const onOpenChange = jest.fn();

    await act(async () =>
      root.render(
        <AddLinkDialog open onOpenChange={onOpenChange} onConfirm={jest.fn()} />
      )
    );

    const input = container.querySelector('input')!;
    await act(async () => {
      input.focus();
      setInputValue(input, 'https://example.com');
    });

    expect(input.style.textOverflow).not.toBe('ellipsis');

    await act(async () => input.blur());
    expect(input.style.textOverflow).toBe('ellipsis');

    await act(async () => input.focus());

    const clearButton = container.querySelector('button[aria-label="delete"]');
    expect(clearButton).not.toBeNull();

    await act(async () => (clearButton as HTMLButtonElement).click());
    expect(input.value).toBe('');

    await act(async () => setInputValue(input, 'https://example.com'));
    const cancelButton = [...container.querySelectorAll('button')].find(
      button => button.textContent === 'cancel'
    )!;
    await act(async () => cancelButton.click());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('rejects invalid links and keeps the dialog open', async () => {
    const onConfirm = jest.fn();
    const onOpenChange = jest.fn();

    await act(async () =>
      root.render(
        <AddLinkDialog open onOpenChange={onOpenChange} onConfirm={onConfirm} />
      )
    );

    const input = container.querySelector('input')!;
    await act(async () => setInputValue(input, 'www.example.com'));

    const saveButton = [...container.querySelectorAll('button')].find(
      button => button.textContent === 'chat.home.upload.save'
    )!;
    await act(async () => saveButton.click());

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith('chat.home.upload.invalid_link');
  });

  it('submits a prepared url and prevents duplicate saves', async () => {
    const request = deferred<void>();
    const onConfirm = jest.fn(() => request.promise);
    const onOpenChange = jest.fn();

    await act(async () =>
      root.render(
        <AddLinkDialog open onOpenChange={onOpenChange} onConfirm={onConfirm} />
      )
    );

    const input = container.querySelector('input')!;
    await act(async () => setInputValue(input, '  https://example.com/path  '));

    const saveButton = [...container.querySelectorAll('button')].find(
      button => button.textContent === 'chat.home.upload.save'
    )!;
    await act(async () => saveButton.click());
    await act(async () => saveButton.click());

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith('https://example.com/path');

    await act(async () => {
      request.resolve();
      await request.promise;
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
