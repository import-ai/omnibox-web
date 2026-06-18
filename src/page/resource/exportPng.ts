import { toBlob } from 'html-to-image';

const EXPORT_SELECTOR = '[data-resource-export-content="true"]';
const EXPORT_PIXEL_RATIO = 2;
const FALLBACK_EXPORT_BACKGROUND = '#ffffff';
const FALLBACK_EXPORT_COLOR = '#111827';
const EXPORT_WIDTH = 390;
const EXPORT_PADDING = 16;
const IMAGE_LOAD_TIMEOUT = 8000;
const LAZY_IMAGE_PLACEHOLDER = '/images/img-loading.svg';

function downloadBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function getExportFileName(name?: string) {
  const baseName = (name || 'untitled').replace(/[\\/:*?"<>|]/g, '_');
  return baseName.toLowerCase().endsWith('.png') ? baseName : `${baseName}.png`;
}

function isTransparentColor(color: string) {
  return (
    !color ||
    color === 'transparent' ||
    color === 'rgba(0, 0, 0, 0)' ||
    color === 'rgba(0,0,0,0)'
  );
}

function getEffectiveBackgroundColor(element: HTMLElement) {
  let current: HTMLElement | null = element;
  while (current) {
    const background = window.getComputedStyle(current).backgroundColor;
    if (!isTransparentColor(background)) {
      return background;
    }
    current = current.parentElement;
  }

  const bodyBackground = window.getComputedStyle(document.body).backgroundColor;
  if (!isTransparentColor(bodyBackground)) {
    return bodyBackground;
  }

  const rootBackground = window.getComputedStyle(
    document.documentElement
  ).backgroundColor;
  return isTransparentColor(rootBackground)
    ? FALLBACK_EXPORT_BACKGROUND
    : rootBackground;
}

function getExportTheme(container: HTMLElement) {
  const color =
    window.getComputedStyle(container).color || FALLBACK_EXPORT_COLOR;

  return {
    background: getEffectiveBackgroundColor(container),
    color,
  };
}

function isPlaceholderSource(source: string | null | undefined) {
  return !!source && source.includes(LAZY_IMAGE_PLACEHOLDER);
}

function getRenderedSource(image: HTMLImageElement) {
  return image.currentSrc || image.src || '';
}

function isLazyImageReady(image: HTMLImageElement) {
  const renderedSource = getRenderedSource(image);
  return (
    !isPlaceholderSource(renderedSource) &&
    image.complete &&
    image.naturalWidth > 0
  );
}

function prepareLazyImages(container: HTMLElement) {
  const images = Array.from(container.querySelectorAll('img'));
  const restoreCallbacks: Array<() => void> = [];
  const activatedLazyImages = new WeakSet<HTMLImageElement>();

  for (const image of images) {
    const originalSrc = image.getAttribute('src');
    const originalSrcset = image.getAttribute('srcset');
    const originalLoading = image.getAttribute('loading');
    const originalDecoding = image.getAttribute('decoding');
    const originalDataSrc = image.getAttribute('data-src');
    const originalDataSrcset = image.getAttribute('data-srcset');
    const hadLazySource = !!(originalDataSrc || originalDataSrcset);

    if (originalDataSrc) {
      image.setAttribute('src', originalDataSrc);
      image.removeAttribute('data-src');
    }
    if (originalDataSrcset) {
      image.setAttribute('srcset', originalDataSrcset);
      image.removeAttribute('data-srcset');
    }
    if (hadLazySource) {
      activatedLazyImages.add(image);
    }

    image.setAttribute('loading', 'eager');
    image.setAttribute('decoding', 'sync');
    restoreCallbacks.push(() => {
      if (originalSrc) {
        image.setAttribute('src', originalSrc);
      } else {
        image.removeAttribute('src');
      }
      if (originalSrcset) {
        image.setAttribute('srcset', originalSrcset);
      } else {
        image.removeAttribute('srcset');
      }
      if (originalLoading) {
        image.setAttribute('loading', originalLoading);
      } else {
        image.removeAttribute('loading');
      }
      if (originalDecoding) {
        image.setAttribute('decoding', originalDecoding);
      } else {
        image.removeAttribute('decoding');
      }
      if (originalDataSrc) {
        image.setAttribute('data-src', originalDataSrc);
      }
      if (originalDataSrcset) {
        image.setAttribute('data-srcset', originalDataSrcset);
      }
    });
  }

  return {
    restore: () => restoreCallbacks.forEach(callback => callback()),
    activatedLazyImages,
  };
}

function waitForBestEffortImageLoad(image: HTMLImageElement) {
  return new Promise<void>(resolve => {
    if (image.complete) {
      resolve();
      return;
    }

    const finish = () => {
      window.clearTimeout(timer);
      image.removeEventListener('load', finish);
      image.removeEventListener('error', finish);
      resolve();
    };
    const timer = window.setTimeout(finish, IMAGE_LOAD_TIMEOUT);

    image.addEventListener('load', finish);
    image.addEventListener('error', finish);
  });
}

function waitForLazyImageLoad(image: HTMLImageElement) {
  return new Promise<void>(resolve => {
    if (isLazyImageReady(image)) {
      resolve();
      return;
    }

    const finish = () => {
      window.clearTimeout(timer);
      image.removeEventListener('load', handleUpdate);
      image.removeEventListener('error', finish);
      resolve();
    };
    const timer = window.setTimeout(finish, IMAGE_LOAD_TIMEOUT);

    const handleUpdate = () => {
      if (isLazyImageReady(image)) {
        finish();
      }
    };

    image.addEventListener('load', handleUpdate);
    image.addEventListener('error', finish);
  });
}

function shouldWaitForLazyImage(
  image: HTMLImageElement,
  activatedLazyImages: WeakSet<HTMLImageElement>
) {
  if (activatedLazyImages.has(image)) {
    return true;
  }

  return (
    isPlaceholderSource(image.getAttribute('src')) ||
    isPlaceholderSource(image.getAttribute('srcset')) ||
    isPlaceholderSource(getRenderedSource(image))
  );
}

async function decodeImage(image: HTMLImageElement) {
  if (!image.decode || image.naturalWidth === 0) {
    return;
  }

  try {
    await image.decode();
  } catch {
    // Best effort: a broken image should not block export.
  }
}

async function waitForImages(
  container: HTMLElement,
  activatedLazyImages: WeakSet<HTMLImageElement>
) {
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    images.map(async image => {
      if (shouldWaitForLazyImage(image, activatedLazyImages)) {
        await waitForLazyImageLoad(image);
      } else {
        await waitForBestEffortImageLoad(image);
      }
      await decodeImage(image);
    })
  );
}

function createMobileExportNode(
  container: HTMLElement,
  theme: ReturnType<typeof getExportTheme>
) {
  const holder = document.createElement('div');
  const exportNode = document.createElement('div');
  const clone = container.cloneNode(true) as HTMLElement;
  const contentWidth = EXPORT_WIDTH - EXPORT_PADDING * 2;

  holder.style.position = 'fixed';
  holder.style.left = '0';
  holder.style.top = '0';
  holder.style.opacity = '0';
  holder.style.pointerEvents = 'none';
  holder.style.zIndex = '-1';

  exportNode.style.width = `${EXPORT_WIDTH}px`;
  exportNode.style.padding = `${EXPORT_PADDING}px`;
  exportNode.style.boxSizing = 'border-box';
  exportNode.style.background = theme.background;
  exportNode.style.color = theme.color;

  clone.style.width = `${contentWidth}px`;
  clone.style.maxWidth = `${contentWidth}px`;
  clone.style.boxSizing = 'border-box';

  exportNode.appendChild(clone);
  holder.appendChild(exportNode);
  document.body.appendChild(holder);

  return {
    holder,
    node: exportNode,
    remove: () => holder.remove(),
  };
}

export async function exportResourceAsPng(resourceName: string | undefined) {
  const container = document.querySelector<HTMLElement>(EXPORT_SELECTOR);
  if (!container) {
    throw new Error('Resource export content not found');
  }

  const exportTheme = getExportTheme(container);
  const { node, remove } = createMobileExportNode(container, exportTheme);
  const { restore, activatedLazyImages } = prepareLazyImages(node);

  try {
    await waitForImages(node, activatedLazyImages);

    const height = Math.ceil(node.scrollHeight);
    const blob = await toBlob(node, {
      cacheBust: true,
      pixelRatio: EXPORT_PIXEL_RATIO,
      backgroundColor: exportTheme.background,
      width: EXPORT_WIDTH,
      height,
      style: {
        background: exportTheme.background,
        color: exportTheme.color,
      },
    });

    if (!blob) {
      throw new Error('Failed to export PNG');
    }

    downloadBlob(blob, getExportFileName(resourceName));
  } finally {
    restore();
    remove();
  }
}
