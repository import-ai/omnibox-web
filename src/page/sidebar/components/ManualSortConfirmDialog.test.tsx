/** @jest-environment jsdom */

import { act, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { ManualSortConfirmDialog } from './ManualSortConfirmDialog';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/components/ui/AlertDialog', () => ({
  AlertDialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? children : null,
  AlertDialogAction: (props: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props} />
  ),
  AlertDialogCancel: (props: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props} />
  ),
  AlertDialogContent: ({ children }: { children: ReactNode }) => children,
  AlertDialogDescription: ({ children }: { children: ReactNode }) => children,
  AlertDialogFooter: ({ children }: { children: ReactNode }) => children,
  AlertDialogHeader: ({ children }: { children: ReactNode }) => children,
  AlertDialogTitle: ({ children }: { children: ReactNode }) => children,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('ManualSortConfirmDialog', () => {
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

  it('shows the first-time explanation when no manual order exists', async () => {
    await act(async () =>
      root.render(
        <ManualSortConfirmDialog
          open
          loading={false}
          hasExistingManualSort={false}
          onCancel={jest.fn()}
          onConfirm={jest.fn()}
          spaceName="Personal"
        />
      )
    );

    expect(container.textContent).toContain(
      'sidebar.sort.confirm_initial_description'
    );
    expect(container.textContent).not.toContain(
      'sidebar.sort.confirm_description'
    );
  });

  it('shows the overwrite warning when a manual order exists', async () => {
    await act(async () =>
      root.render(
        <ManualSortConfirmDialog
          open
          loading={false}
          hasExistingManualSort
          onCancel={jest.fn()}
          onConfirm={jest.fn()}
          spaceName="Personal"
        />
      )
    );

    expect(container.textContent).toContain('sidebar.sort.confirm_description');
    expect(container.textContent).not.toContain(
      'sidebar.sort.confirm_initial_description'
    );
  });
});
