/** @jest-environment jsdom */
import { act, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { ImagePreviewDialog } from './ImagePreviewDialog';

jest.mock('react', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  return { ...react, default: react };
});
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/lib/captcha', () => ({ isInsideAliyunCaptcha: () => false }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function Fixture({
  onCloseAutoFocus,
  removeInvokerOnOpen = false,
}: {
  onCloseAutoFocus?: (event: Event) => void;
  removeInvokerOnOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [showInvoker, setShowInvoker] = useState(true);
  const invokerRef = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      {showInvoker ? (
        <button
          type="button"
          data-invoker=""
          onClick={event => {
            invokerRef.current = event.currentTarget;
            setOpen(true);
            if (removeInvokerOnOpen) setShowInvoker(false);
          }}
        >
          Preview
        </button>
      ) : null}
      <ImagePreviewDialog
        alt="Diagram"
        src="/missing-image.png"
        referrerPolicy="no-referrer"
        open={open}
        invokerRef={invokerRef}
        onCloseAutoFocus={onCloseAutoFocus}
        onOpenChange={setOpen}
      />
    </>
  );
}

describe('ImagePreviewDialog', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.useFakeTimers();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    await act(async () => jest.runOnlyPendingTimers());
    container.remove();
    jest.useRealTimers();
  });

  const openPreview = async () => {
    const invoker =
      container.querySelector<HTMLButtonElement>('[data-invoker]')!;
    await act(async () => invoker.click());
    return invoker;
  };

  it('keeps the failed image dismissible through the backdrop', async () => {
    await act(async () => root.render(<Fixture />));
    const invoker = await openPreview();
    const dialog = document.querySelector<HTMLElement>('[data-image-preview]')!;
    const image = dialog.querySelector<HTMLImageElement>('img')!;
    const close = dialog.querySelector<HTMLButtonElement>(
      'button[aria-label="close"]'
    )!;

    expect(image.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(document.activeElement).toBe(close);
    await act(async () => image.dispatchEvent(new Event('error')));
    expect(document.querySelector('[data-image-preview]')).toBe(dialog);
    await act(async () => dialog.click());
    await act(async () => jest.runOnlyPendingTimers());
    expect(document.querySelector('[data-image-preview]')).toBeNull();
    expect(document.activeElement).toBe(invoker);
  });

  it('dismisses the enlarged image on click and restores the invoker', async () => {
    await act(async () => root.render(<Fixture />));
    const invoker = await openPreview();
    const image = document.querySelector<HTMLImageElement>(
      '[data-image-preview] img'
    )!;
    await act(async () => image.click());
    await act(async () => jest.runOnlyPendingTimers());
    expect(document.querySelector('[data-image-preview]')).toBeNull();
    expect(document.activeElement).toBe(invoker);
  });

  it('lets a host own close focus when its callback prevents the default', async () => {
    const host = document.createElement('button');
    document.body.append(host);
    try {
      await act(async () =>
        root.render(
          <Fixture
            onCloseAutoFocus={event => {
              event.preventDefault();
              host.focus();
            }}
          />
        )
      );
      await openPreview();
      await act(async () =>
        document
          .querySelector<HTMLButtonElement>('[data-image-preview] button')!
          .click()
      );
      await act(async () => jest.runOnlyPendingTimers());
      expect(document.activeElement).toBe(host);
    } finally {
      host.remove();
    }
  });

  it('restores the invoker when the host callback does not take focus', async () => {
    const onCloseAutoFocus = jest.fn();
    await act(async () =>
      root.render(<Fixture onCloseAutoFocus={onCloseAutoFocus} />)
    );
    const invoker = await openPreview();
    await act(async () =>
      document
        .querySelector<HTMLButtonElement>('[data-image-preview] button')!
        .click()
    );
    await act(async () => jest.runOnlyPendingTimers());
    expect(onCloseAutoFocus).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(invoker);
  });

  it('does not focus a detached invoker after dismissal', async () => {
    await act(async () => root.render(<Fixture removeInvokerOnOpen />));
    const invoker = await openPreview();
    expect(invoker.isConnected).toBe(false);
    await act(async () =>
      document
        .querySelector<HTMLButtonElement>('[data-image-preview] button')!
        .click()
    );
    await act(async () => jest.runOnlyPendingTimers());
    expect(document.activeElement).not.toBe(invoker);
    expect(document.querySelector('[data-image-preview]')).toBeNull();
  });
});
