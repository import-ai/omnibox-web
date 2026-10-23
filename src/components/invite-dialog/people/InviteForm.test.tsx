/** @jest-environment jsdom */

import { act, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { http } from '@/lib/request';

import InviteForm from './InviteForm';

let mockNamespaceId = 'space-a';
jest.mock('react-router-dom', () => ({
  useParams: () => ({ namespace_id: mockNamespaceId }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/lib/request', () => ({
  http: { get: jest.fn(), post: jest.fn() },
}));
jest.mock('sonner', () => ({ toast: jest.fn() }));
jest.mock('@/components/SupportedEmailLink', () => ({
  SupportedEmailLink: () => null,
}));
jest.mock('@/components/ui/Form', () => {
  const { Controller, FormProvider } = jest.requireActual('react-hook-form');
  const Wrapper = ({ children }: { children: ReactNode }) => <>{children}</>;
  return {
    Form: FormProvider,
    FormField: Controller,
    FormItem: Wrapper,
    FormControl: Wrapper,
    FormLabel: Wrapper,
    FormDescription: Wrapper,
    FormMessage: () => null,
  };
});
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
jest.mock('@/components/ui/Select', () => ({
  Select: () => null,
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: () => null,
  SelectItem: () => null,
}));
jest.mock('@/components/omnibox/Select', () => ({
  Select: ({
    children,
    value,
    defaultValue,
    onValueChange,
    disabled,
  }: {
    children: ReactNode;
    value?: string;
    defaultValue?: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <select
      value={value}
      defaultValue={value === undefined ? defaultValue : undefined}
      onChange={event => onValueChange(event.target.value)}
      disabled={disabled}
    >
      <option value="" />
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => children,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('shared namespace invitation form', () => {
  let container: HTMLDivElement;
  let root: Root;
  const onFinish = jest.fn();
  const get = http.get as jest.Mock;
  const post = http.post as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNamespaceId = 'space-a';
    localStorage.setItem('uid', 'sender');
    get.mockResolvedValue({ role: 'admin' });
    post.mockResolvedValue(undefined);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    localStorage.clear();
  });

  const render = () =>
    act(async () => root.render(<InviteForm onFinish={onFinish} />));
  const roleSelect = () => container.querySelectorAll('select')[0];
  const submitButton = () =>
    container.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const roleOptions = () =>
    Array.from(roleSelect().options)
      .map(option => option.value)
      .filter(Boolean);

  async function select(select: HTMLSelectElement, value: string) {
    await act(async () => {
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  async function submit() {
    await act(async () => {
      const input = container.querySelector('input')!;
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
      )!.set!.call(input, 'recipient@qq.com');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const permission = container.querySelectorAll('select')[1];
    if (!permission.disabled) await select(permission, 'can_view');
    await act(async () =>
      container
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    );
  }

  it('offers and submits member only for an admin', async () => {
    await render();
    expect(roleOptions()).toEqual(['member']);
    expect(roleSelect().value).toBe('member');
    await submit();
    expect(post).toHaveBeenCalledWith(
      'invite',
      expect.objectContaining({ namespace: 'space-a', role: 'member' })
    );
    expect(onFinish).toHaveBeenCalled();
  });

  it.each(['admin', 'member'])(
    'preserves owner invitations to %s',
    async target => {
      get.mockResolvedValue({ role: 'owner' });
      await render();
      expect(roleOptions()).toEqual(['admin', 'member']);
      await select(roleSelect(), target);
      await submit();
      expect(post).toHaveBeenCalledWith(
        'invite',
        expect.objectContaining({
          role: target,
          permission: target === 'admin' ? 'full_access' : 'can_view',
        })
      );
    }
  );

  it('blocks submission while membership is loading and after it fails', async () => {
    let reject!: (reason: Error) => void;
    get.mockImplementationOnce(
      () =>
        new Promise((_resolve, rejectPromise) => {
          reject = rejectPromise;
        })
    );
    await render();
    expect(submitButton().disabled).toBe(true);
    expect(roleOptions()).not.toContain('admin');
    await act(async () => reject(new Error('unavailable')));
    expect(submitButton().disabled).toBe(true);
    await submit();
    expect(post).not.toHaveBeenCalled();
  });

  it('drops an owner role selection immediately when switching spaces', async () => {
    get.mockResolvedValueOnce({ role: 'owner' });
    await render();
    await select(roleSelect(), 'admin');
    let resolve!: (value: { role: string }) => void;
    get.mockImplementationOnce(
      () =>
        new Promise(resolvePromise => {
          resolve = resolvePromise;
        })
    );
    mockNamespaceId = 'space-b';
    await render();
    expect(submitButton().disabled).toBe(true);
    expect(roleOptions()).not.toContain('admin');
    await act(async () => resolve({ role: 'admin' }));
    await submit();
    expect(post).toHaveBeenCalledWith(
      'invite',
      expect.objectContaining({ namespace: 'space-b', role: 'member' })
    );
  });

  it.each(['member', null])(
    'blocks invitations for actor role %s',
    async role => {
      get.mockResolvedValue({ role });
      await render();
      expect(submitButton().disabled).toBe(true);
      await submit();
      expect(post).not.toHaveBeenCalled();
    }
  );
});
