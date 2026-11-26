/** @jest-environment jsdom */
import { act, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { ImagePreviewDialog, type ImageViewerItem } from './ImagePreviewDialog';

jest.mock('react', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  return { ...react, default: react };
});
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/lib/captcha', () => ({ isInsideAliyunCaptcha: () => false }));

Object.assign(globalThis, {
  IS_REACT_ACT_ENVIRONMENT: true,
  ResizeObserver: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});

const longImageSize = { width: 1428, height: 14180 };

function Fixture({
  imageSize,
  gallery,
  onCloseAutoFocus,
  removeInvokerOnOpen = false,
}: {
  gallery?: ImageViewerItem[];
  imageSize?: { width: number; height: number };
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
        imageSize={imageSize}
        {...(gallery ? { items: gallery, initialItemId: gallery[0]?.id } : {})}
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

  it('shows product tooltips on focus and on hover, including disabled navigation', async () => {
    await act(async () =>
      root.render(
        <Fixture
          gallery={[
            { id: 'one', src: '/one.png', size: longImageSize },
            { id: 'two', src: '/two.png', size: longImageSize },
          ]}
        />
      )
    );
    await openPreview();
    const zoom = document.querySelector<HTMLButtonElement>(
      'button[aria-label="image_viewer.zoom_in"]'
    )!;
    await act(async () => zoom.focus());
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe(
      'image_viewer.zoom_in'
    );
    await act(async () => zoom.blur());
    const previous = document.querySelector<HTMLButtonElement>(
      'button[aria-label="image_viewer.previous"]'
    )!;
    expect(previous.getAttribute('aria-disabled')).toBe('true');
    const hoverTarget = previous.closest('[data-slot="tooltip-trigger"]');
    expect(hoverTarget).not.toBeNull();
    const hover = new MouseEvent('pointermove', { bubbles: true });
    Object.defineProperty(hover, 'pointerType', { value: 'mouse' });
    await act(async () => hoverTarget!.dispatchEvent(hover));
    await act(async () => jest.runOnlyPendingTimers());
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe(
      'image_viewer.first_image'
    );
    await act(async () => previous.click());
    expect(
      document.querySelector('[data-image-preview] img')?.getAttribute('src')
    ).toBe('/one.png');
    await act(async () =>
      hoverTarget!.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
          cancelable: true,
        })
      )
    );
    expect(document.querySelector('[data-image-preview]')).toBeNull();
  });

  it('displays the current zoom without opening a tooltip on hover', async () => {
    await act(async () => root.render(<Fixture imageSize={longImageSize} />));
    await openPreview();
    const ratio = document.querySelector('[data-image-preview] output')!;
    expect(ratio.textContent).toMatch(/%$/);
    const hover = new MouseEvent('pointermove', { bubbles: true });
    Object.defineProperty(hover, 'pointerType', { value: 'mouse' });
    await act(async () => ratio.dispatchEvent(hover));
    await act(async () => jest.advanceTimersByTime(300));
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });

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

  it('preserves the ordinary preview chrome and clicking the zoom-out cursor closes it', async () => {
    await act(async () =>
      root.render(<Fixture imageSize={{ width: 600, height: 1000 }} />)
    );
    const invoker = await openPreview();
    const dialog = document.querySelector('[data-image-preview]')!;
    const image = dialog.querySelector<HTMLImageElement>('img')!;
    const close = dialog.querySelector<HTMLButtonElement>(
      'button[aria-label="close"]'
    )!;
    expect(dialog.classList.contains('bg-transparent')).toBe(true);
    expect(close.classList.contains('rounded-full')).toBe(true);
    expect(close.classList.contains('bg-black/55')).toBe(true);
    expect(close.style.right).toBe('');
    expect(close.style.top).toBe('');
    expect(close.classList.contains('right-3')).toBe(true);
    expect(close.classList.contains('top-3')).toBe(true);
    expect(image.classList.contains('cursor-zoom-out')).toBe(true);
    expect(image.parentElement?.classList.contains('rounded-md')).toBe(true);
    await act(async () => image.click());
    await act(async () => jest.runOnlyPendingTimers());
    expect(dialog.isConnected).toBe(false);
    expect(document.activeElement).toBe(invoker);
  });

  it('shows zoom, original size and rotation without dismissing the image', async () => {
    await act(async () =>
      root.render(<Fixture imageSize={{ width: 2400, height: 1200 }} />)
    );
    await openPreview();
    const dialog = document.querySelector('[data-image-preview]')!;
    const button = (key: string) =>
      dialog.querySelector<HTMLButtonElement>(
        `button[aria-label="image_viewer.${key}"]`
      )!;
    const image = dialog.querySelector('img')!;
    await act(async () => button('actual_size').click());
    expect(image.style.width).toBe('2400px');
    await act(async () => button('zoom_in').click());
    expect(image.style.width).toBe('3000px');
    await act(async () => button('zoom_out').click());
    expect(image.style.width).toBe('2400px');
    await act(async () => button('rotate').click());
    expect(image.style.transform).toContain('90deg');
    expect(image.parentElement!.style.width).toBe('1200px');
    expect(image.parentElement!.style.height).toBe('2400px');
    await act(async () => button('fit').click());
    expect(Number.parseFloat(image.style.width)).toBeLessThan(2400);
  });

  it('pans a zoomed ordinary image without dismissing on the drag release', async () => {
    await act(async () =>
      root.render(<Fixture imageSize={{ width: 2400, height: 1200 }} />)
    );
    await openPreview();
    const dialog = document.querySelector('[data-image-preview]')!;
    const image = dialog.querySelector('img')!;
    const viewport = dialog.querySelector<HTMLElement>('[role="region"]')!;
    await act(async () =>
      dialog
        .querySelector<HTMLButtonElement>(
          '[aria-label="image_viewer.actual_size"]'
        )!
        .click()
    );
    viewport.scrollLeft = 50;
    const setPointerCapture = jest.fn();
    Object.assign(image.parentElement!, { setPointerCapture });
    const send = (type: string, clientX: number, buttons: number) => {
      const event = new MouseEvent(type, {
        bubbles: true,
        clientX,
        clientY: 20,
        buttons,
        button: 0,
      });
      Object.defineProperties(event, {
        pointerType: { value: 'mouse' },
        pointerId: { value: 1 },
      });
      image.dispatchEvent(event);
    };
    await act(async () => {
      send('pointerdown', 50, 1);
      send('pointermove', 48, 1);
    });
    expect(setPointerCapture).not.toHaveBeenCalled();
    await act(async () => {
      send('pointermove', 30, 1);
      send('pointerup', 30, 0);
      image.click();
    });
    expect(setPointerCapture).toHaveBeenCalledWith(1);
    expect(viewport.scrollLeft).toBe(70);
    expect(dialog.isConnected).toBe(true);
    await act(async () => {
      send('pointerdown', 30, 1);
      send('pointerup', 30, 0);
      image.click();
    });
    expect(dialog.isConnected).toBe(false);
  });

  it('navigates duplicate-URL occurrences without download or comment controls', async () => {
    await act(async () =>
      root.render(
        <Fixture
          gallery={[
            {
              id: 'first',
              src: '/same.jpg',
              alt: 'First',
              size: longImageSize,
            },
            {
              id: 'second',
              src: '/same.jpg',
              alt: 'Second',
              size: longImageSize,
            },
          ]}
        />
      )
    );
    await openPreview();
    const dialog = document.querySelector('[data-image-preview]')!;
    expect(dialog.querySelector('img')?.alt).toBe('First');
    expect(dialog.querySelector('a[download]')).toBeNull();
    expect(
      dialog.querySelector('[aria-label="image_viewer.download"]')
    ).toBeNull();
    expect(
      dialog.querySelector('[aria-label="image_viewer.comments"]')
    ).toBeNull();
    await act(async () =>
      dialog
        .querySelector<HTMLButtonElement>('[aria-label="image_viewer.rotate"]')!
        .click()
    );
    await act(async () =>
      dialog
        .querySelector<HTMLButtonElement>('[aria-label="image_viewer.next"]')!
        .click()
    );
    expect(dialog.querySelector('img')?.alt).toBe('Second');
    expect(dialog.querySelector('img')?.style.transform).toContain('0deg');
    expect(dialog.querySelector('a[download]')).toBeNull();
    expect(
      dialog.querySelector('[aria-label="image_viewer.download"]')
    ).toBeNull();
    expect(
      dialog
        .querySelector<HTMLButtonElement>('[aria-label="image_viewer.next"]')
        ?.getAttribute('aria-disabled')
    ).toBe('true');
  });

  it('keeps one close button anchored to the dialog across view and image changes', async () => {
    await act(async () =>
      root.render(
        <Fixture
          gallery={[
            { id: 'one', src: '/one.png', size: { width: 600, height: 400 } },
            { id: 'two', src: '/two.png', size: longImageSize },
          ]}
        />
      )
    );
    await openPreview();
    const dialog = document.querySelector('[data-image-preview]')!;
    const close = dialog.querySelector<HTMLButtonElement>(
      '[aria-label="close"]'
    )!;
    const button = (name: string) =>
      dialog.querySelector<HTMLButtonElement>(
        `[aria-label="image_viewer.${name}"]`
      )!;
    const expectFixedClose = () => {
      expect(dialog.querySelector('[aria-label="close"]')).toBe(close);
      expect(close.parentElement).toBe(dialog);
      expect(close.style.top).toBe('');
      expect(close.style.right).toBe('');
      expect(close.classList.contains('top-3')).toBe(true);
      expect(close.classList.contains('right-3')).toBe(true);
    };
    expectFixedClose();
    for (const action of ['zoom_in', 'rotate', 'actual_size', 'fit', 'next']) {
      await act(async () => button(action).click());
      expectFixedClose();
    }
    const viewport = dialog.querySelector<HTMLElement>('[role="region"]')!;
    await act(async () => {
      viewport.scrollTop = 3000;
      viewport.dispatchEvent(new Event('scroll'));
      window.dispatchEvent(new Event('resize'));
    });
    expectFixedClose();
    await act(async () =>
      dialog.querySelector('img')!.dispatchEvent(new Event('error'))
    );
    expectFixedClose();
  });

  it.each([
    ['zoom_in', 'max_zoom', '400%'],
    ['zoom_out', 'min_zoom', '10%'],
  ])(
    'retains focus at the %s boundary and blocks further activation',
    async (action, reason, ratio) => {
      await act(async () => root.render(<Fixture imageSize={longImageSize} />));
      await openPreview();
      const dialog = document.querySelector('[data-image-preview]')!;
      const button = dialog.querySelector<HTMLButtonElement>(
        `[aria-label="image_viewer.${action}"]`
      )!;
      await act(async () => button.focus());
      for (
        let step = 0;
        step < 20 && button.getAttribute('aria-disabled') !== 'true';
        step++
      ) {
        await act(async () => button.click());
        expect(
          dialog.querySelector(`[aria-label="image_viewer.${action}"]`)
        ).toBe(button);
        expect(document.activeElement).toBe(button);
      }
      expect(button.getAttribute('aria-disabled')).toBe('true');
      expect(dialog.querySelector('output')?.textContent).toBe(ratio);
      const image = dialog.querySelector('img')!;
      const width = image.style.width;
      await act(async () => button.click());
      expect(image.style.width).toBe(width);
      expect(document.activeElement).toBe(button);
      await act(async () => button.blur());
      await act(async () => button.focus());
      await act(async () => jest.runOnlyPendingTimers());
      expect(document.querySelector('[role="tooltip"]')?.textContent).toBe(
        `image_viewer.${reason}`
      );
    }
  );

  it('keeps directional focus at both gallery boundaries', async () => {
    await act(async () =>
      root.render(
        <Fixture
          gallery={[
            { id: 'one', src: '/one.png', size: longImageSize },
            { id: 'two', src: '/two.png', size: longImageSize },
          ]}
        />
      )
    );
    await openPreview();
    const dialog = document.querySelector('[data-image-preview]')!;
    const button = (name: string) =>
      dialog.querySelector<HTMLButtonElement>(
        `[aria-label="image_viewer.${name}"]`
      )!;
    for (const [direction, source] of [
      ['next', '/two.png'],
      ['previous', '/one.png'],
    ]) {
      await act(async () => button(direction).focus());
      await act(async () => button(direction).click());
      expect(button(direction).getAttribute('aria-disabled')).toBe('true');
      expect(document.activeElement).toBe(button(direction));
      await act(async () => button(direction).click());
      expect(dialog.querySelector('img')?.getAttribute('src')).toBe(source);
    }
  });

  it('starts a long image at the top and reopens at its initial fit', async () => {
    await act(async () => root.render(<Fixture imageSize={longImageSize} />));
    const invoker = await openPreview();
    const dialog = document.querySelector('[data-image-preview]')!;
    const viewport = dialog.querySelector<HTMLElement>('[role="region"]')!;
    expect(viewport.classList.contains('no-scrollbar')).toBe(true);
    expect(viewport.classList.contains('overscroll-contain')).toBe(true);
    expect(viewport.hasAttribute('data-image-viewer-long')).toBe(true);
    await act(async () => dialog.querySelector('img')!.click());
    expect(dialog.isConnected).toBe(true);
    expect(dialog.querySelector('img')!.classList.contains('rounded-md')).toBe(
      false
    );
    expect(viewport.scrollTop).toBe(0);
    viewport.scrollTop = 3400;
    await act(async () =>
      dialog
        .querySelector<HTMLButtonElement>(
          '[aria-label="image_viewer.actual_size"]'
        )!
        .click()
    );
    expect(dialog.querySelector('img')!.style.width).toBe('1428px');
    await act(async () =>
      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
    );
    await act(async () => jest.runOnlyPendingTimers());
    expect(dialog.isConnected).toBe(false);
    expect(document.activeElement).toBe(invoker);
    await openPreview();
    expect(
      document.querySelector<HTMLElement>(
        '[data-image-preview] [role="region"]'
      )!.scrollTop
    ).toBe(0);
    expect(
      document.querySelector<HTMLImageElement>('[data-image-preview] img')!
        .style.width
    ).not.toBe('1428px');
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
