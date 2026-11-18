import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

const FAILED_IMAGE_SELECTOR = '.tiptap-image[data-image-load-failed="true"]';
const RETRY_QUERY_KEY = 'image_retry';

function getImageContainer(img: HTMLImageElement) {
  const container = img.closest<HTMLElement>('.tiptap-image');
  if (!container) return undefined;
  return {
    container,
    content:
      container.querySelector<HTMLElement>('.tiptap-image-content') ??
      undefined,
  };
}

function markFailed(
  img: HTMLImageElement,
  message: string,
  failedImages: Set<HTMLImageElement>
) {
  const parts = getImageContainer(img);
  if (!parts) return false;

  failedImages.add(img);
  parts.container.setAttribute('data-image-load-failed', 'true');
  parts.content?.setAttribute('data-image-error-label', message);
  return true;
}

function clearFailed(img: HTMLImageElement) {
  const parts = getImageContainer(img);
  parts?.container.removeAttribute('data-image-load-failed');
  parts?.content?.removeAttribute('data-image-error-label');
}

function retrySource(src: string): string {
  if (/^(?:data|blob):/i.test(src)) return src;

  let url: URL;
  try {
    url = new URL(src, window.location.href);
  } catch {
    return src;
  }

  if (url.origin === window.location.origin) {
    url.searchParams.set(RETRY_QUERY_KEY, String(Date.now()));
  }
  return url.href;
}

function applyErrorLabel(root: HTMLElement, message: string): void {
  for (const container of root.querySelectorAll<HTMLElement>(
    FAILED_IMAGE_SELECTOR
  )) {
    container
      .querySelector<HTMLElement>('.tiptap-image-content')
      ?.setAttribute('data-image-error-label', message);
  }
}

function resetFailures(
  root: HTMLElement | null,
  failedImages: Set<HTMLImageElement>
): void {
  root
    ?.querySelectorAll<HTMLElement>(FAILED_IMAGE_SELECTOR)
    .forEach(container => {
      container.removeAttribute('data-image-load-failed');
      container
        .querySelector<HTMLElement>('.tiptap-image-content')
        ?.removeAttribute('data-image-error-label');
    });
  failedImages.clear();
}

function inspectLoadedImages(
  root: HTMLElement,
  message: string,
  failedImages: Set<HTMLImageElement>
): boolean {
  let changed = false;
  for (const img of root.querySelectorAll<HTMLImageElement>(
    '.tiptap-image img'
  )) {
    if (failedImages.has(img)) continue;
    if (!img.complete || img.naturalWidth > 0) continue;
    changed = markFailed(img, message, failedImages) || changed;
  }
  return changed;
}

function useErrorLabel(
  containerRef: RefObject<HTMLElement | null>,
  message: string,
  messageRef: RefObject<string>
) {
  useEffect(() => {
    messageRef.current = message;
    const root = containerRef.current;
    if (root) applyErrorLabel(root, message);
  }, [containerRef, message, messageRef]);
}

function useFailureReset(
  containerRef: RefObject<HTMLElement | null>,
  failedImagesRef: RefObject<Set<HTMLImageElement>>,
  resetKey: string,
  setFailedImageCount: (count: number) => void
) {
  useEffect(() => {
    resetFailures(containerRef.current, failedImagesRef.current);
    setFailedImageCount(0);
  }, [containerRef, failedImagesRef, resetKey, setFailedImageCount]);
}

function useFailureTracking(
  containerRef: RefObject<HTMLElement | null>,
  messageRef: RefObject<string>,
  failedImagesRef: RefObject<Set<HTMLImageElement>>,
  syncCount: () => void
) {
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const inspect = () => {
      if (
        inspectLoadedImages(root, messageRef.current, failedImagesRef.current)
      ) {
        syncCount();
      }
    };
    const handleError = (event: Event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement)) return;
      if (!img.closest('.tiptap-image')) return;
      if (markFailed(img, messageRef.current, failedImagesRef.current)) {
        syncCount();
      }
    };
    const handleLoad = (event: Event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement)) return;
      if (!failedImagesRef.current.delete(img)) return;
      clearFailed(img);
      syncCount();
    };
    const observer = new MutationObserver(inspect);

    root.addEventListener('error', handleError, true);
    root.addEventListener('load', handleLoad, true);
    observer.observe(root, { childList: true, subtree: true });
    inspect();
    return () => {
      observer.disconnect();
      root.removeEventListener('error', handleError, true);
      root.removeEventListener('load', handleLoad, true);
    };
  }, [containerRef, failedImagesRef, messageRef, syncCount]);
}

function retryImages(
  root: HTMLElement,
  failedImages: Set<HTMLImageElement>
): void {
  for (const img of root.querySelectorAll<HTMLImageElement>(
    '.tiptap-image img'
  )) {
    if (!failedImages.has(img)) continue;
    const src = img.getAttribute('src');
    if (!src) continue;
    img.removeAttribute('src');
    img.setAttribute('src', retrySource(src));
  }
}

export function useResourceImageFailures(
  containerRef: RefObject<HTMLElement | null>,
  message: string,
  resetKey: string
) {
  const failedImagesRef = useRef(new Set<HTMLImageElement>());
  const messageRef = useRef(message);
  const [failedImageCount, setFailedImageCount] = useState(0);

  const syncCount = useCallback(() => {
    const failedImages = failedImagesRef.current;
    for (const img of failedImages) {
      if (!img.isConnected) failedImages.delete(img);
    }
    setFailedImageCount(failedImages.size);
  }, []);

  useErrorLabel(containerRef, message, messageRef);
  useFailureReset(containerRef, failedImagesRef, resetKey, setFailedImageCount);
  useFailureTracking(containerRef, messageRef, failedImagesRef, syncCount);

  const retryFailedImages = useCallback(() => {
    const root = containerRef.current;
    if (!root) return;
    retryImages(root, failedImagesRef.current);
    syncCount();
  }, [containerRef, syncCount]);

  return { failedImageCount, retryFailedImages };
}
