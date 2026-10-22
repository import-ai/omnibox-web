/** @jest-environment jsdom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { TaskPagination } from './TaskPagination';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test('pagination prevents navigation beyond boundaries and selects numbered pages', () => {
  const host = document.createElement('div');
  const root = createRoot(host);
  const onPageChange = jest.fn();
  const render = (currentPage: number) =>
    act(() =>
      root.render(
        <TaskPagination
          currentPage={currentPage}
          totalPages={10}
          onPageChange={onPageChange}
        />
      )
    );
  render(1);
  act(() =>
    host
      .querySelector<HTMLAnchorElement>('[aria-label="common.previous"]')!
      .click()
  );
  expect(onPageChange).not.toHaveBeenCalled();
  act(() =>
    Array.from(host.querySelectorAll('a'))
      .find(a => a.textContent === '2')!
      .click()
  );
  expect(onPageChange).toHaveBeenCalledWith(2);
  onPageChange.mockClear();
  render(10);
  expect(host.querySelector('[aria-current="page"]')?.textContent).toBe('10');
  act(() =>
    host.querySelector<HTMLAnchorElement>('[aria-label="common.next"]')!.click()
  );
  expect(onPageChange).not.toHaveBeenCalled();
  act(() => root.unmount());
});
