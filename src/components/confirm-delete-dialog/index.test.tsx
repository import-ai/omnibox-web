/** @jest-environment jsdom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { toast } from 'sonner';

import { http } from '@/lib/request';

import ConfirmDeleteDialog from './index';

jest.mock('@/lib/request', () => ({ http: { delete: jest.fn() } }));
jest.mock('@/components/sonner', () => ({ actionButtonClassName: '' }));
jest.mock('sonner', () => ({
  toast: Object.assign(jest.fn(), { error: jest.fn() }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  Trans: () => null,
}));
jest.mock('@/components/ui/alert-dialog', () => {
  const Box = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  const Action = ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>;
  return {
    AlertDialog: Box,
    AlertDialogContent: Box,
    AlertDialogHeader: Box,
    AlertDialogTitle: Box,
    AlertDialogDescription: Box,
    AlertDialogFooter: Box,
    AlertDialogCancel: Action,
    AlertDialogAction: Action,
  };
});

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

it('gives the chat delete failure one localized owner and mutes the global toast', async () => {
  const failure = {
    response: { status: 500, data: { message: 'private upstream failure' } },
  };
  jest.mocked(http.delete).mockRejectedValue(failure);
  const container = document.createElement('div');
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <ConfirmDeleteDialog
        open
        errorContext="chat"
        itemTitle="Chat"
        deleteUrl="/conversation"
        onOpenChange={() => {}}
      />
    )
  );
  await act(async () => {
    [...container.querySelectorAll('button')]
      .find(button => button.textContent === 'delete')!
      .click();
  });
  expect(http.delete).toHaveBeenCalledWith('/conversation', {
    mute: true,
    errorContext: 'chat',
    redirectOnUnauthorized: true,
  });
  expect(toast.error).toHaveBeenCalledTimes(1);
  expect(jest.mocked(toast.error).mock.calls[0][0]).toEqual(
    expect.objectContaining({
      props: expect.objectContaining({ error: failure }),
    })
  );
  await act(async () => root.unmount());
});
