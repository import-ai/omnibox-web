import { cn } from 'cn';
import { X } from 'lucide-react';
import {
  type CSSProperties,
  type ImgHTMLAttributes,
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
import { trackButtonClick } from '@/lib/trackButtonClick';

const LONG_IMAGE_ASPECT_RATIO = 3;

interface ImageSize {
  width: number;
  height: number;
}

interface ImagePreviewDialogProps {
  allowLongImage?: boolean;
  imageSize?: ImageSize;
  alt?: string;
  open: boolean;
  src?: string | null;
  referrerPolicy?: ImgHTMLAttributes<HTMLImageElement>['referrerPolicy'];
  invokerRef?: RefObject<HTMLElement | null>;
  onCloseAutoFocus?: (event: Event) => void;
  onOpenChange: (open: boolean) => void;
}

export function ImagePreviewDialog({
  allowLongImage = false,
  imageSize,
  alt,
  open,
  src,
  referrerPolicy,
  invokerRef,
  onCloseAutoFocus,
  onOpenChange,
}: ImagePreviewDialogProps) {
  const { t } = useTranslation();
  const closeRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const zoomAnchor = useRef<{ x: number; y: number } | null>(null);
  const [isTallOverflow, setTallOverflow] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [retained, setRetained] = useState({
    src,
    alt,
    referrerPolicy,
    imageSize,
  });
  useLayoutEffect(() => {
    if (open) setRetained({ src, alt, referrerPolicy, imageSize });
  }, [open, src, alt, referrerPolicy, imageSize]);
  const imageSrc = open ? src : retained.src;
  const title = (open ? alt : retained.alt) || t('chat.image.preview');
  const { width = 0, height = 0 } =
    (open ? imageSize : retained.imageSize) ?? {};
  const isTall =
    allowLongImage && width > 0 && height >= width * LONG_IMAGE_ASPECT_RATIO;
  const showLongImage = isTall && isTallOverflow && !imageFailed;

  useLayoutEffect(() => {
    if (!open || !isTall) return;
    const measure = () => {
      const fitWidth = Math.min(width, window.innerWidth * 0.9, 960);
      setTallOverflow((fitWidth * height) / width > window.innerHeight * 0.85);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [open, isTall, width, height]);

  useLayoutEffect(() => {
    if (!open) return;
    setImageFailed(false);
  }, [open, imageSrc]);

  useLayoutEffect(() => {
    if (!open) return;
    zoomAnchor.current = null;
    setZoomed(false);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
      scrollRef.current.scrollLeft = 0;
    }
  }, [open, imageSrc, showLongImage]);

  useLayoutEffect(() => {
    const anchor = zoomAnchor.current;
    const viewport = scrollRef.current;
    const image = imageRef.current;
    if (!anchor || !viewport || !image) return;
    zoomAnchor.current = null;
    const bounds = viewport.getBoundingClientRect();
    const rect = image.getBoundingClientRect();
    viewport.scrollLeft +=
      rect.left +
      rect.width * anchor.x -
      bounds.left -
      viewport.clientWidth / 2;
    viewport.scrollTop += rect.top + rect.height * anchor.y - bounds.top;
  }, [zoomed]);

  const toggleZoom = () => {
    const viewport = scrollRef.current;
    const image = imageRef.current;
    if (viewport && image) {
      const bounds = viewport.getBoundingClientRect();
      const rect = image.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        zoomAnchor.current = {
          x: (bounds.left + viewport.clientWidth / 2 - rect.left) / rect.width,
          // Keep the line at the top of the viewport at the same position.
          y: (bounds.top - rect.top) / rect.height,
        };
      }
    }
    setZoomed(!zoomed);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        outsideCloseTrackName="resource_overlay_close"
        outsideCloseTarget="image"
        showCloseButton={false}
        data-image-preview=""
        className={cn(
          'fixed left-0 top-0 flex h-full w-full max-w-none sm:max-w-none translate-x-0 translate-y-0 items-center justify-center gap-0 border-0 p-0 shadow-none motion-reduce:animate-none',
          showLongImage ? 'bg-black/75 ring-0' : 'bg-transparent'
        )}
        style={
          {
            '--tw-enter-scale': '1',
            '--tw-exit-scale': '1',
            '--tw-enter-translate-x': '0px',
            '--tw-enter-translate-y': '0px',
            '--tw-exit-translate-x': '0px',
            '--tw-exit-translate-y': '0px',
          } as CSSProperties
        }
        onOpenAutoFocus={event => {
          event.preventDefault();
          closeRef.current?.focus({ preventScroll: true });
        }}
        onCloseAutoFocus={event => {
          onCloseAutoFocus?.(event);
          if (event.defaultPrevented) return;
          event.preventDefault();
          const invoker = invokerRef?.current;
          if (invoker?.isConnected) invoker.focus({ preventScroll: true });
        }}
        onEscapeKeyDown={event => event.stopPropagation()}
        onClick={event => {
          event.stopPropagation();
          if (
            event.target === event.currentTarget ||
            (showLongImage && event.target === scrollRef.current)
          ) {
            trackButtonClick('resource_image_close');
            onOpenChange(false);
          }
        }}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          {t('chat.image.preview')}
        </DialogDescription>
        {imageSrc ? (
          <div
            className={
              showLongImage
                ? 'pointer-events-none absolute inset-0'
                : 'relative max-h-[90vh] max-w-[min(90vw,960px)]'
            }
          >
            <div
              ref={scrollRef}
              className={
                showLongImage
                  ? 'pointer-events-auto no-scrollbar absolute inset-x-0 top-0 bottom-14 overflow-auto overscroll-contain [overflow-anchor:none] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white'
                  : undefined
              }
              role={showLongImage ? 'region' : undefined}
              aria-label={showLongImage ? t('chat.image.preview') : undefined}
              tabIndex={showLongImage ? 0 : undefined}
            >
              <img
                ref={imageRef}
                src={imageSrc}
                referrerPolicy={open ? referrerPolicy : retained.referrerPolicy}
                alt={title}
                width={showLongImage ? width : undefined}
                height={showLongImage ? height : undefined}
                className={
                  showLongImage
                    ? 'mx-auto block h-auto max-w-none'
                    : 'max-h-[85vh] w-full cursor-zoom-out rounded-md object-contain'
                }
                style={
                  showLongImage
                    ? {
                        width: zoomed
                          ? `max(min(135%, 1440px), ${width}px)`
                          : `min(90%, 960px, ${width}px)`,
                      }
                    : undefined
                }
                onError={isTall ? () => setImageFailed(true) : undefined}
                onClick={
                  showLongImage
                    ? undefined
                    : () => {
                        trackButtonClick('resource_image_close');
                        onOpenChange(false);
                      }
                }
              />
            </div>
            <DialogClose asChild>
              <button
                onClick={() => trackButtonClick('resource_image_close')}
                ref={closeRef}
                type="button"
                aria-label={t('close')}
                className={cn(
                  'absolute top-3 right-3 z-10 inline-flex size-8 items-center justify-center rounded-full bg-black/55 text-white shadow-xs transition-colors hover:bg-black/75 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/40',
                  showLongImage && 'pointer-events-auto'
                )}
              >
                <X className="size-4" />
              </button>
            </DialogClose>
            {showLongImage && (
              <button
                type="button"
                onClick={toggleZoom}
                className="pointer-events-auto absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
              >
                {t(zoomed ? 'chat.image.fit_width' : 'chat.image.zoom_in')}
              </button>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
