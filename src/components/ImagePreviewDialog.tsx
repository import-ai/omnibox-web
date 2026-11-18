import { X } from 'lucide-react';
import {
  type CSSProperties,
  type ImgHTMLAttributes,
  type PointerEvent,
  type ReactNode,
  type RefObject,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/omnibox/Dialog';
import { TooltipProvider } from '@/components/tooltip';
import { trackButtonClick } from '@/lib/trackButtonClick';

import type { ImageViewerDownload } from './imageViewerActions';
import {
  getImageViewerLayout,
  type ImageViewerSize,
  isLongImage,
  rotateImagePoint,
} from './imageViewerGeometry';
import { ImageViewerHint } from './ImageViewerHint';
import {
  type ImageViewerNavigation,
  ImageViewerToolbar,
} from './ImageViewerToolbar';

export interface ImageViewerCommentAction {
  count: number;
  canAdd?: boolean;
  needsSave?: boolean;
  onOpen: (threadId?: string) => boolean | void;
  threads?: { id: string; label: string }[];
}

export interface ImageViewerItem {
  id: string;
  src: string;
  alt?: string;
  size?: ImageViewerSize;
  referrerPolicy?: ImgHTMLAttributes<HTMLImageElement>['referrerPolicy'];
  download?: ImageViewerDownload;
  allowExternalOriginal?: boolean;
}

interface ImagePreviewDialogProps {
  imageSize?: ImageViewerSize;
  alt?: string;
  open: boolean;
  src?: string | null;
  referrerPolicy?: ImgHTMLAttributes<HTMLImageElement>['referrerPolicy'];
  invokerRef?: RefObject<HTMLElement | null>;
  onCloseAutoFocus?: (event: Event) => void;
  onOpenChange: (open: boolean) => void;
  items?: ImageViewerItem[];
  initialItemId?: string;
  download?: ImageViewerDownload;
  allowExternalOriginal?: boolean;
  getCommentAction?: (itemId: string) => ImageViewerCommentAction | undefined;
}

export function ImagePreviewDialog({
  imageSize,
  alt,
  src,
  referrerPolicy,
  open,
  invokerRef,
  onOpenChange,
  onCloseAutoFocus,
  items,
  initialItemId,
  download,
  allowExternalOriginal,
  getCommentAction,
}: ImagePreviewDialogProps) {
  const { t } = useTranslation();
  const closeRef = useRef<HTMLButtonElement>(null);
  const autoFocusing = useRef(false);
  const restoreNavigationFocus = useRef<'previous' | 'next' | null>(null);
  const retained = useRef<ImageViewerItem>(undefined);
  const [selected, setSelected] = useState<{ origin?: string; id: string }>();
  const gallery = items?.length
    ? items
    : src
      ? [
          {
            id: src,
            src,
            alt,
            size: imageSize,
            referrerPolicy,
            download,
            allowExternalOriginal,
          },
        ]
      : [];
  const start = gallery.findIndex(item => item.id === initialItemId);
  const current =
    selected && selected.origin === initialItemId
      ? gallery.findIndex(item => item.id === selected.id)
      : -1;
  const index = current >= 0 ? current : Math.max(0, start);
  const item = gallery[index];
  const visibleItem = open ? item : retained.current;
  const title = visibleItem?.alt || t('chat.image.preview');
  useLayoutEffect(() => {
    if (open) retained.current = item;
  }, [item, open]);
  useLayoutEffect(() => {
    const direction = restoreNavigationFocus.current;
    if (!direction) return;
    restoreNavigationFocus.current = null;
    const scope = closeRef.current?.parentElement;
    const button = scope?.querySelector<HTMLButtonElement>(
      `[data-image-viewer-nav="${direction}"]:not(:disabled)`
    );
    (button ?? closeRef.current)?.focus({ preventScroll: true });
  }, [item?.id]);

  useLayoutEffect(() => {
    if (!open) setSelected(undefined);
  }, [open]);

  const move = (delta: number) => {
    const next = gallery[index + delta];
    if (next) {
      restoreNavigationFocus.current = delta < 0 ? 'previous' : 'next';
      setSelected({ origin: initialItemId, id: next.id });
    }
  };
  const close = () => {
    trackButtonClick('resource_image_close');
    onOpenChange(false);
  };

  const renderClose = (position?: CSSProperties) => (
    <ImageViewerHint label={t('close')} onEscape={() => onOpenChange(false)}>
      <DialogClose asChild>
        <button
          ref={closeRef}
          type="button"
          aria-label={t('close')}
          className="absolute right-3 top-3 z-10 inline-flex size-8 items-center justify-center rounded-full bg-black/55 text-white shadow-xs transition-colors hover:bg-black/75 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
          style={position}
          onFocus={event => {
            if (autoFocusing.current) event.preventDefault();
          }}
          onClick={() => trackButtonClick('resource_image_close')}
        >
          <X className="size-4" />
        </button>
      </DialogClose>
    </ImageViewerHint>
  );

  return (
    <TooltipProvider delayDuration={250} disableHoverableContent>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          data-image-preview=""
          showCloseButton={false}
          outsideCloseTrackName="resource_overlay_close"
          outsideCloseTarget="image"
          className="fixed inset-0 flex h-full w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-transparent p-0 has-[[data-image-viewer-long]]:bg-black/75 text-white shadow-none ring-0 sm:max-w-none motion-reduce:animate-none"
          style={
            {
              '--tw-enter-scale': '1',
              '--tw-exit-scale': '1',
              '--tw-enter-translate-x': '0px',
              '--tw-enter-translate-y': '0px',
            } as CSSProperties
          }
          onOpenAutoFocus={event => {
            event.preventDefault();
            autoFocusing.current = true;
            closeRef.current?.focus({ preventScroll: true });
            autoFocusing.current = false;
          }}
          onCloseAutoFocus={event => {
            onCloseAutoFocus?.(event);
            if (event.defaultPrevented) return;
            event.preventDefault();
            if (invokerRef?.current?.isConnected)
              invokerRef.current.focus({ preventScroll: true });
          }}
          onEscapeKeyDown={event => event.stopPropagation()}
          onKeyDown={event => {
            if (
              !['ArrowLeft', 'ArrowRight'].includes(event.key) ||
              !(event.target instanceof HTMLButtonElement) ||
              gallery.length < 2
            )
              return;
            event.preventDefault();
            event.stopPropagation();
            move(event.key === 'ArrowLeft' ? -1 : 1);
          }}
          onClick={event => {
            event.stopPropagation();
            if (event.target === event.currentTarget) close();
          }}
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('chat.image.preview')}
          </DialogDescription>
          {visibleItem ? (
            <ImageViewerSlide
              key={JSON.stringify([visibleItem.id, visibleItem.src])}
              item={visibleItem}
              title={title}
              renderClose={renderClose}
              comment={open ? getCommentAction?.(visibleItem.id) : undefined}
              close={close}
              onOpenChange={onOpenChange}
              navigation={
                gallery.length > 1
                  ? { index, length: gallery.length, move }
                  : undefined
              }
            />
          ) : (
            renderClose()
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

function ImageViewerSlide({
  item,
  title,
  comment,
  renderClose,
  close,
  onOpenChange,
  navigation,
}: {
  item: ImageViewerItem;
  title: string;
  comment?: ImageViewerCommentAction;
  renderClose: (position?: CSSProperties) => ReactNode;
  close: () => void;
  onOpenChange: (open: boolean) => void;
  navigation?: ImageViewerNavigation;
}) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef<
    { id: number; x: number; y: number; left: number; top: number } | undefined
  >(undefined);
  const dragged = useRef(false);
  const anchor = useRef<
    { x: number; y: number; horizontal: number; vertical: number } | undefined
  >(undefined);
  const [size, setSize] = useState(item.size);
  const [viewport, setViewport] = useState({
    width: 0,
    height: 0,
    dialogHeight: 0,
  });
  const [turn, setTurn] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const isTall = !!size && isLongImage(size);
  const layout =
    size &&
    size.width > 0 &&
    size.height > 0 &&
    !failed &&
    viewport.width > 0 &&
    viewport.height > 0
      ? getImageViewerLayout(size, viewport, turn, zoom)
      : undefined;

  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const measure = () => {
      const width = node.clientWidth || window.innerWidth;
      const dialogHeight =
        node.parentElement?.clientHeight || window.innerHeight;
      const height = node.clientHeight || Math.max(1, dialogHeight - 56);
      setViewport(previous =>
        previous.width === width &&
        previous.height === height &&
        previous.dialogHeight === dialogHeight
          ? previous
          : { width, height, dialogHeight }
      );
    };
    measure();
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(measure);
    observer?.observe(node);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  useLayoutEffect(() => {
    const position = anchor.current;
    const node = scrollRef.current;
    if (!position || !node || !layout) return;
    anchor.current = undefined;
    const point = rotateImagePoint(position, turn);
    node.scrollLeft = Math.max(
      0,
      layout.x + point.x * layout.width - position.horizontal
    );
    node.scrollTop = Math.max(
      0,
      layout.y + point.y * layout.height - position.vertical
    );
  }, [layout, turn]);

  const setView = (nextZoom: number | null, nextTurn = turn) => {
    const node = scrollRef.current;
    if (!node || !layout || (nextZoom === zoom && nextTurn === turn)) return;
    const horizontal = viewport.width / 2;
    const vertical = layout.long && nextTurn === turn ? 0 : viewport.height / 2;
    const clamp = (value: number) => Math.max(0, Math.min(1, value));
    const point = rotateImagePoint(
      {
        x: clamp((node.scrollLeft + horizontal - layout.x) / layout.width),
        y: clamp((node.scrollTop + vertical - layout.y) / layout.height),
      },
      -turn
    );
    anchor.current = { ...point, horizontal, vertical };
    setTurn(nextTurn);
    setZoom(nextZoom);
  };

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    const node = scrollRef.current;
    dragged.current = false;
    if (
      !layout ||
      !node ||
      event.pointerType !== 'mouse' ||
      event.button !== 0 ||
      (layout.width <= viewport.width && layout.height <= viewport.height)
    )
      return;
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: node.scrollLeft,
      top: node.scrollTop,
    };
  }

  const closePosition =
    !isTall &&
    layout &&
    layout.width <= viewport.width &&
    layout.height <= viewport.height
      ? {
          top: layout.y + 12,
          right: viewport.width - layout.x - layout.width + 12,
        }
      : undefined;

  return (
    <>
      {renderClose(closePosition)}
      <div
        ref={scrollRef}
        data-image-viewer-long={isTall && !failed ? '' : undefined}
        role="region"
        aria-label={t('chat.image.preview')}
        tabIndex={0}
        className="no-scrollbar min-h-0 flex-1 overflow-auto overscroll-contain [overflow-anchor:none] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
        onClick={event => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div
          className="relative min-h-full min-w-full"
          style={
            layout
              ? {
                  width: layout.widthWithGutter,
                  height: layout.heightWithGutter,
                }
              : undefined
          }
          onClick={event => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div
            className={`absolute overflow-hidden ${isTall ? '' : 'rounded-md'}`}
            style={
              layout
                ? {
                    left: layout.x,
                    top: layout.y,
                    width: layout.width,
                    height: layout.height,
                    cursor:
                      isTall &&
                      (layout.width > viewport.width ||
                        layout.height > viewport.height)
                        ? 'grab'
                        : undefined,
                  }
                : {
                    inset: 0,
                    display: 'grid',
                    placeItems: 'center',
                    pointerEvents: 'none',
                  }
            }
            onPointerDown={startDrag}
            onPointerMove={event => {
              const node = scrollRef.current;
              const pan = drag.current;
              if (!node || !pan || event.pointerId !== pan.id) return;
              if (!(event.buttons & 1)) {
                drag.current = undefined;
                return;
              }
              if (!dragged.current) {
                if (
                  Math.hypot(pan.x - event.clientX, pan.y - event.clientY) < 4
                )
                  return;
                dragged.current = true;
                event.currentTarget.setPointerCapture(event.pointerId);
              }
              node.scrollLeft = pan.left + pan.x - event.clientX;
              node.scrollTop = pan.top + pan.y - event.clientY;
            }}
            onClick={event => {
              if (
                !isTall &&
                !failed &&
                !dragged.current &&
                event.target instanceof HTMLImageElement
              )
                close();
            }}
            onPointerUp={() => {
              drag.current = undefined;
            }}
            onPointerCancel={() => {
              drag.current = undefined;
            }}
            onLostPointerCapture={() => {
              drag.current = undefined;
            }}
          >
            <img
              src={item.src}
              referrerPolicy={item.referrerPolicy}
              alt={title}
              draggable={false}
              className={`${
                layout
                  ? 'absolute top-1/2 left-1/2 block max-w-none select-none'
                  : 'pointer-events-auto max-h-[90%] max-w-[90%] object-contain'
              }${isTall ? '' : ' cursor-zoom-out'}`}
              style={
                layout
                  ? {
                      width: layout.imageWidth,
                      height: layout.imageHeight,
                      transform: `translate(-50%, -50%) rotate(${turn * 90}deg)`,
                    }
                  : undefined
              }
              onLoad={event => {
                const { naturalWidth, naturalHeight } = event.currentTarget;
                if (naturalWidth && naturalHeight)
                  setSize({ width: naturalWidth, height: naturalHeight });
                setFailed(false);
              }}
              onError={() => setFailed(true)}
              hidden={failed}
            />
            {failed && <p role="status">{t('chat.image.load_failed')}</p>}
          </div>
        </div>
      </div>
      <ImageViewerToolbar
        item={item}
        layout={layout}
        comment={comment}
        navigation={navigation}
        setView={setView}
        onRotate={() => layout && setView(layout.scale, (turn + 1) % 4)}
        onOpenChange={onOpenChange}
      />
    </>
  );
}
