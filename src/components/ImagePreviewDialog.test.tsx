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

const longImageSize = { width: 1428, height: 14180 };

function Fixture({
  allowLongImage,
  imageSize,
  onCloseAutoFocus,
  removeInvokerOnOpen = false,
}: {
  allowLongImage?: boolean;
  imageSize?: { width: number; height: number };
  onCloseAutoFocus?: (event: Event) => void;
  removeInvokerOnOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [showInvoker, setShowInvoker] = useState(true);
  const invokerRef = useRef<HTMLButtonElement | null>(null);
  const imageLayout = { allowLongImage, imageSize };
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
        {...imageLayout}
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

function findButton(scope: ParentNode, label: string) {
  return Array.from(scope.querySelectorAll('button')).find(
    button => button.textContent === label
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

  it('lets opted-in long images zoom without closing and resets the mode when reopened', async () => {
    await act(async () =>
      root.render(<Fixture allowLongImage imageSize={longImageSize} />)
    );
    const invoker = await openPreview();
    const dialog = document.querySelector('[data-image-preview]')!;
    const image = dialog.querySelector('img')!;
    const viewport = dialog.querySelector<HTMLElement>('[role="region"]')!;
    viewport.scrollTop = 2400;
    jest.spyOn(viewport, 'clientWidth', 'get').mockReturnValue(950);
    jest
      .spyOn(viewport, 'getBoundingClientRect')
      .mockReturnValue({ left: 32, top: 56 } as DOMRect);
    jest.spyOn(image, 'getBoundingClientRect').mockImplementation(() => {
      const zoomed = !!findButton(dialog, 'chat.image.fit_width');
      return {
        left: 32 - viewport.scrollLeft,
        top: 56 - viewport.scrollTop,
        width: zoomed ? 1428 : 950,
        height: zoomed ? 15000 : 10000,
      } as DOMRect;
    });
    const toggle = findButton(dialog, 'chat.image.zoom_in');
    expect(toggle).toBeDefined();
    await act(async () => image.click());
    expect(document.querySelector('[data-image-preview]')).toBe(dialog);
    await act(async () => toggle!.click());
    expect(findButton(dialog, 'chat.image.fit_width')).toBe(toggle);
    expect(dialog.querySelector('img')).toBe(image);
    expect([viewport.scrollTop, viewport.scrollLeft]).toEqual([3600, 239]);

    await act(async () =>
      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
    );
    await act(async () => jest.runOnlyPendingTimers());
    expect(document.querySelector('[data-image-preview]')).toBeNull();
    expect(document.activeElement).toBe(invoker);
    await openPreview();
    expect(findButton(document, 'chat.image.zoom_in')).toBeDefined();
    const reopened = document.querySelector<HTMLElement>(
      '[data-image-preview] [role="region"]'
    )!;
    expect([reopened.scrollTop, reopened.scrollLeft]).toEqual([0, 0]);
  });

  it('keeps a scrollbar-free long-image surface and dismisses only from its gutter', async () => {
    await act(async () =>
      root.render(<Fixture allowLongImage imageSize={longImageSize} />)
    );
    const invoker = await openPreview();
    const dialog = document.querySelector('[data-image-preview]')!;
    const viewport = dialog.querySelector<HTMLElement>('[role="region"]')!;
    const image = dialog.querySelector('img')!;
    expect(viewport.classList.contains('no-scrollbar')).toBe(true);
    expect(viewport.classList.contains('overflow-auto')).toBe(true);
    expect(viewport.classList.contains('overscroll-contain')).toBe(true);
    expect(image.classList.contains('rounded-md')).toBe(false);
    await act(async () => image.click());
    expect(document.querySelector('[data-image-preview]')).toBe(dialog);
    await act(async () => viewport.click());
    await act(async () => jest.runOnlyPendingTimers());
    expect(document.querySelector('[data-image-preview]')).toBeNull();
    expect(document.activeElement).toBe(invoker);
  });

  it.each([
    ['a non-opted-in long image', false, longImageSize],
    ['an ordinary portrait', true, { width: 600, height: 1200 }],
    ['a tall image that already fits', true, { width: 30, height: 90 }],
  ])(
    'keeps the existing preview for %s',
    async (_name, allowLongImage, imageSize) => {
      await act(async () =>
        root.render(
          <Fixture allowLongImage={allowLongImage} imageSize={imageSize} />
        )
      );
      await openPreview();
      const dialog = document.querySelector('[data-image-preview]')!;
      expect(findButton(dialog, 'chat.image.zoom_in')).toBeUndefined();
      await act(async () => dialog.querySelector('img')!.click());
      await act(async () => jest.runOnlyPendingTimers());
      expect(document.querySelector('[data-image-preview]')).toBeNull();
    }
  );

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
