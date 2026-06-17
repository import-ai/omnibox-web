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

function prepareLazyImages(container: HTMLElement) {
  const images = Array.from(container.querySelectorAll('img'));
  const restoreCallbacks: Array<() => void> = [];

  for (const image of images) {
    const originalSrc = image.getAttribute('src');
    const originalSrcset = image.getAttribute('srcset');
    const originalLoading = image.getAttribute('loading');
    const originalDecoding = image.getAttribute('decoding');
    const originalDataSrc = image.getAttribute('data-src');
    const originalDataSrcset = image.getAttribute('data-srcset');

    if (originalDataSrc) {
      image.setAttribute('src', originalDataSrc);
      image.removeAttribute('data-src');
    }
    if (originalDataSrcset) {
      image.setAttribute('srcset', originalDataSrcset);
      image.removeAttribute('data-srcset');
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

  return () => restoreCallbacks.forEach(callback => callback());
}

function waitForImageLoad(image: HTMLImageElement) {
  return new Promise<void>((resolve, reject) => {
    const src = [
      image.getAttribute('src'),
      image.getAttribute('srcset'),
      image.currentSrc,
      image.src,
    ].find(value => value && !value.includes(LAZY_IMAGE_PLACEHOLDER));
    if (!src) {
      reject(new Error('Image source is not ready'));
      return;
    }

    const renderedSource = image.currentSrc || image.src;
    if (image.complete && !renderedSource.includes(LAZY_IMAGE_PLACEHOLDER)) {
      if (image.naturalWidth > 0) {
        resolve();
      } else {
        reject(new Error('Image failed to load'));
      }
      return;
    }

    const cleanup = () => {
      window.clearTimeout(timer);
      image.removeEventListener('load', handleLoad);
      image.removeEventListener('error', handleError);
    };
    const handleLoad = () => {
      cleanup();
      if (image.naturalWidth > 0) {
        resolve();
      } else {
        reject(new Error('Image failed to load'));
      }
    };
    const handleError = () => {
      cleanup();
      reject(new Error('Image failed to load'));
    };
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('Image load timeout'));
    }, IMAGE_LOAD_TIMEOUT);

    image.addEventListener('load', handleLoad);
    image.addEventListener('error', handleError);
  });
}

async function decodeImage(image: HTMLImageElement) {
  if (!image.decode) {
    return;
  }

  await image.decode();
}

async function waitForImages(container: HTMLElement) {
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    images.map(async image => {
      await waitForImageLoad(image);
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
  const restoreLazyImages = prepareLazyImages(node);

  try {
    await waitForImages(node);

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
    restoreLazyImages();
    remove();
  }
}
