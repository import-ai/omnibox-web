/** @jest-environment jsdom */
import { act, type ComponentProps, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';

import { ImagePreviewDialog } from '@/components/ImagePreviewDialog';

jest.mock('@/lib/captcha', () => ({ isInsideAliyunCaptcha: () => false }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const Preview = ImagePreviewDialog as ComponentType<
  ComponentProps<typeof ImagePreviewDialog> & {
    referrerPolicy?: 'same-origin';
    onCloseAutoFocus?: (event: Event) => void;
  }
>;

test('passes the image referrer policy and allows the document host to restore focus on close', async () => {
  jest.useFakeTimers();
  const container = document.body.appendChild(document.createElement('div'));
  const root = createRoot(container);
  const closeFocus = jest.fn((event: Event) => event.preventDefault());
  const render = (open: boolean) =>
    act(async () =>
      root.render(
        <Preview
          open={open}
          src="/preview.png"
          alt="Diagram"
          referrerPolicy="same-origin"
          onOpenChange={() => {}}
          onCloseAutoFocus={closeFocus}
        />
      )
    );
  try {
    await render(true);
    expect(
      document
        .querySelector('[role="dialog"] img')
        ?.getAttribute('referrerpolicy')
    ).toBe('same-origin');
    await render(false);
    await act(async () => jest.runOnlyPendingTimers());
    expect(closeFocus).toHaveBeenCalledTimes(1);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    await act(async () => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  }
});
