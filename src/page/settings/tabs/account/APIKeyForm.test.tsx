/** @jest-environment jsdom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { TooltipProvider } from '@/components/tooltip';

import { APIKeyForm } from './APIKeyForm';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, default: actual, __esModule: true };
});

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

jest.mock('@/lib/captcha', () => ({ isInsideAliyunCaptcha: () => false }));
jest.mock('@/service/resource', () => ({
  fetchRootResources: jest
    .fn()
    .mockResolvedValue({ private: { id: 'personal' } }),
}));
const mockCreate = jest.fn().mockResolvedValue({});
const mockPatch = jest.fn().mockResolvedValue({});
const mockDelete = jest.fn();
const mockToast = jest.fn();
const mockKeys = [
  {
    id: 'key-id',
    value: 'test-key',
    created_at: '2026-09-29T00:00:00Z',
    attrs: { root_resource_id: '', permissions: [] },
  },
];
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
jest.mock('react-router-dom', () => ({
  useParams: () => ({ namespace_id: 'space' }),
}));
jest.mock('@/hooks/useUser', () => ({
  __esModule: true,
  default: () => ({ uid: 'user' }),
}));
jest.mock('@/hooks/useApiKeys', () => ({
  __esModule: true,
  default: () => ({
    apiKeys: mockKeys,
    loading: false,
    deleteAPIKey: mockDelete,
    createAPIKey: mockCreate,
    patchAPIKey: mockPatch,
  }),
}));
jest.mock('@/page/settings/SettingsToastProvider', () => ({
  useSettingsToast: () => ({ showToast: mockToast }),
}));
jest.mock('@/components/help-tooltip', () => ({ HelpTooltip: () => null }));
jest.mock('@/components/resourceSelect', () => ({
  ResourceSelect: ({
    resourceId,
    onChange,
  }: {
    resourceId: string;
    onChange: (id: string) => void;
  }) => (
    <button data-testid="scope" onClick={() => onChange('personal_and_team')}>
      {resourceId}
    </button>
  ),
}));
jest.mock('./APIKeyPermissionScope', () => ({
  APIKeyPermissionScope: () => null,
}));
jest.mock('@/lib/time', () => ({ getRelatedTime: () => 'yesterday' }));

it('keeps deletion open while pending and on failure, then closes after a successful retry', async () => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  let rejectDelete!: (reason: Error) => void;
  mockDelete.mockImplementationOnce(
    () =>
      new Promise((_, reject) => {
        rejectDelete = reject;
      })
  );
  const button = (text: string) =>
    Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
      item => item.textContent === text
    )!;
  try {
    await act(async () =>
      root.render(
        <TooltipProvider>
          <APIKeyForm />
        </TooltipProvider>
      )
    );
    act(() =>
      (
        container.querySelector('svg.lucide-trash2')?.closest('button') ??
        container.querySelector('svg.lucide-trash-2')?.closest('button')
      )?.click()
    );
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    act(() => button('delete').click());
    expect(button('delete').disabled).toBe(true);
    expect(button('cancel').disabled).toBe(true);
    act(() => button('delete').click());
    expect(mockDelete).toHaveBeenCalledTimes(1);
    await act(async () => rejectDelete(new Error('Rejected')));
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    expect(document.querySelector('[role="alert"]')?.textContent).toBe(
      'api_key.delete.error'
    );
    expect(mockToast).not.toHaveBeenCalled();
    mockDelete.mockResolvedValueOnce(undefined);
    await act(async () => button('delete').click());
    expect(mockDelete).toHaveBeenCalledTimes(2);
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(mockToast).toHaveBeenCalledWith('api_key.delete.success', 'success');
    expect(mockToast).toHaveBeenCalledTimes(1);
  } finally {
    act(() => root.unmount());
    container.remove();
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = false;
  }
});

it('defaults new keys to Personal and explicitly serializes a combined choice', async () => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        <TooltipProvider>
          <APIKeyForm />
        </TooltipProvider>
      )
    );
    await act(async () =>
      Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
        .find(b => b.textContent === 'create')!
        .click()
    );
    expect(document.querySelector('[data-testid="scope"]')?.textContent).toBe(
      'personal'
    );
    await act(async () =>
      (
        document.querySelector('[data-testid="scope"]') as HTMLButtonElement
      ).click()
    );
    expect(document.querySelector('[data-testid="scope"]')?.textContent).toBe(
      'personal_and_team'
    );
    await act(async () =>
      (document.querySelector('[role="checkbox"]') as HTMLButtonElement).click()
    );
    await act(async () =>
      Array.from(
        document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')
      )
        .find(b => b.textContent === 'create')!
        .click()
    );
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        attrs: expect.objectContaining({
          resource_scope: 'personal_and_team',
          root_resource_id: 'personal',
        }),
      })
    );
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});
