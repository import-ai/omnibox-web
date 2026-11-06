export function preloadImage(src: string, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Image loading cancelled', 'AbortError'));
      return;
    }
    if (!src) {
      reject(new Error('Image URL is missing'));
      return;
    }

    const image = new Image();
    const finish = (error?: Error) => {
      clearTimeout(timeout);
      signal.removeEventListener('abort', onAbort);
      image.onload = null;
      image.onerror = null;
      if (error) {
        image.removeAttribute('src');
        reject(error);
      } else {
        resolve();
      }
    };
    const onAbort = () =>
      finish(new DOMException('Image loading cancelled', 'AbortError'));
    const timeout = setTimeout(
      () => finish(new Error('Image loading timed out')),
      30_000
    );
    signal.addEventListener('abort', onAbort, { once: true });
    image.onload = () => finish();
    image.onerror = () => finish(new Error('Image could not be loaded'));
    image.src = src;
  });
}
