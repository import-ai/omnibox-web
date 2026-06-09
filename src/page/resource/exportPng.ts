import { toBlob } from 'html-to-image';

const EXPORT_SELECTOR = '[data-resource-export-content="true"]';
const EXPORT_PIXEL_RATIO = 2;
const FALLBACK_EXPORT_BACKGROUND = '#ffffff';
const FALLBACK_EXPORT_COLOR = '#111827';
const EXPORT_WIDTH = 390;
const EXPORT_PADDING = 16;
const IMAGE_LOAD_TIMEOUT = 8000;

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

async function waitForImages(container: HTMLElement) {
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    images.map(
      image =>
        new Promise<void>(resolve => {
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
        })
    )
  );
}

function prepareLazyImages(container: HTMLElement) {
  const images = Array.from(container.querySelectorAll('img[data-src]'));
  const restoreCallbacks: Array<() => void> = [];

  for (const image of images) {
    const originalSrc = image.getAttribute('src');
    const originalDataSrc = image.getAttribute('data-src');
    if (!originalDataSrc) {
      continue;
    }

    image.setAttribute('src', originalDataSrc);
    image.removeAttribute('data-src');
    restoreCallbacks.push(() => {
      if (originalSrc) {
        image.setAttribute('src', originalSrc);
      } else {
        image.removeAttribute('src');
      }
      image.setAttribute('data-src', originalDataSrc);
    });
  }

  return () => restoreCallbacks.forEach(callback => callback());
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
