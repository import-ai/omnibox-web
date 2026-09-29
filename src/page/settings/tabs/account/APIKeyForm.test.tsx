/** @jest-environment jsdom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { TooltipProvider } from '@/components/tooltip';

import { APIKeyForm } from './APIKeyForm';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, default: actual, __esModule: true };
});

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
  }),
}));
jest.mock('@/page/settings/SettingsToastProvider', () => ({
  useSettingsToast: () => ({ showToast: mockToast }),
}));
jest.mock('@/components/help-tooltip', () => ({ HelpTooltip: () => null }));
jest.mock('@/components/resourceSelect', () => ({
  ResourceSelect: () => null,
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
    Array.from(document.querySelectorAll('button')).find(
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
