/** @jest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { toast } from 'sonner';

import { downloadFile } from '@/lib/downloadFile';
import { http } from '@/lib/request';

import { FilenameAttribute } from './FilenameAttribute';

jest.mock('react', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  return { ...react, default: react };
});
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/lib/captcha', () => ({ isInsideAliyunCaptcha: () => false }));
jest.mock('@/lib/downloadFile', () => ({ downloadFile: jest.fn() }));
jest.mock('@/lib/request', () => ({ http: { get: jest.fn() } }));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe('FilenameAttribute', () => {
  let container: HTMLDivElement;
  let root: Root;
  let images: HTMLImageElement[];
  const get = jest.mocked(http.get);
  const download = jest.mocked(downloadFile);
  const preview = () =>
    document.querySelector<HTMLImageElement>('[data-image-preview] img');
  const button = () => container.querySelector<HTMLButtonElement>('button')!;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetAllMocks();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    images = [];
    jest.spyOn(window, 'Image').mockImplementation(() => {
      const image = document.createElement('img');
      images.push(image);
      return image;
    });
    get.mockResolvedValue({ url: 'https://storage.example/original' });
    download.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    await act(async () => jest.runOnlyPendingTimers());
    container.remove();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  async function render(filename = 'photo.png', resourceId = 'resource-a') {
    await act(async () =>
      root.render(
        <FilenameAttribute
          filename={filename}
          resourceId={resourceId}
          namespaceId="namespace-a"
        />
      )
    );
  }

  async function click() {
    await act(async () => button().click());
  }

  async function load(image = images[images.length - 1]) {
    await act(async () => image.dispatchEvent(new Event('load')));
  }

  it.each(['png', 'jpeg', 'jpg', 'PNG', 'JPEG', 'JpG'])(
    'previews the original .%s image without downloading',
    async extension => {
      await render(`photo.${extension}`);
      await click();
      expect(get).toHaveBeenCalledWith(
        '/namespaces/namespace-a/resources/resource-a/file',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
      expect(button().disabled).toBe(true);
      expect(preview()).toBeNull();
      await load();
      expect(preview()?.getAttribute('src')).toBe(
        'https://storage.example/original'
      );
      expect(preview()?.alt).toBe(`photo.${extension}`);
      expect(download).not.toHaveBeenCalled();
      expect(button().disabled).toBe(false);
    }
  );

  it.each([
    'report.pdf',
    'notes.txt',
    'video.mp4',
    'image.gif',
    'photo.png.exe',
  ])('preserves the existing download behavior for %s', async filename => {
    await render(filename);
    await click();
    expect(download).toHaveBeenCalledWith(
      'namespace-a',
      'resource-a',
      filename
    );
    expect(get).not.toHaveBeenCalled();
    expect(preview()).toBeNull();
  });

  it('gets a fresh URL on reopening and restores focus on close', async () => {
    await render();
    await click();
    await load();
    await act(async () => preview()!.click());
    await act(async () => jest.runOnlyPendingTimers());
    expect(document.activeElement).toBe(button());
    get.mockResolvedValueOnce({ url: 'https://storage.example/refreshed' });
    await click();
    await load();
    expect(get).toHaveBeenCalledTimes(2);
    expect(preview()?.getAttribute('src')).toBe(
      'https://storage.example/refreshed'
    );
  });

  it('prevents duplicate requests while loading', async () => {
    await render();
    await act(async () => {
      button().click();
      button().click();
    });
    expect(get).toHaveBeenCalledTimes(1);
    await load();
  });

  it('allows retry after an API error without downloading or duplicate toasts', async () => {
    get.mockRejectedValueOnce(new Error('API failure'));
    await render();
    await click();
    expect(button().disabled).toBe(false);
    expect(preview()).toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
    await click();
    await load();
    expect(preview()).not.toBeNull();
    expect(download).not.toHaveBeenCalled();
  });

  it('shows an image error and allows retry when the original cannot load', async () => {
    await render();
    await click();
    await act(async () => images[0].dispatchEvent(new Event('error')));
    expect(toast.error).toHaveBeenCalledWith('chat.image.load_failed');
    expect(button().disabled).toBe(false);
    expect(preview()).toBeNull();
    await click();
    await load();
    expect(preview()).not.toBeNull();
    expect(download).not.toHaveBeenCalled();
  });

  it('recovers when image loading times out', async () => {
    await render();
    await click();
    await act(async () => jest.advanceTimersByTime(30_000));
    expect(button().disabled).toBe(false);
    expect(preview()).toBeNull();
    expect(toast.error).toHaveBeenCalledWith('chat.image.load_failed');
    await act(async () => images[0].dispatchEvent(new Event('load')));
    expect(preview()).toBeNull();
  });

  it('does not show a late response after navigating to another resource', async () => {
    let resolve!: (value: { url: string }) => void;
    get.mockReturnValueOnce(new Promise(done => (resolve = done)));
    await render();
    await click();
    const signal = get.mock.calls[0][1]?.signal;
    await render('second.jpg', 'resource-b');
    expect(signal?.aborted).toBe(true);
    await act(async () => resolve({ url: 'https://storage.example/stale' }));
    expect(preview()).toBeNull();
    expect(images).toHaveLength(0);
    await click();
    await load();
    expect(preview()?.alt).toBe('second.jpg');
  });

  it('closes an open preview when the resource changes', async () => {
    await render();
    await click();
    await load();
    await render('second.jpg', 'resource-b');
    expect(preview()).toBeNull();
    expect(button().disabled).toBe(false);
  });

  it('cancels image loading on unmount without an error toast', async () => {
    await render();
    await click();
    const image = images[0];
    await act(async () => root.render(null));
    await act(async () => image.dispatchEvent(new Event('error')));
    expect(get.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(image.onload).toBeNull();
    expect(image.onerror).toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('cancels a pending image when only the namespace changes', async () => {
    await render();
    await click();
    const image = images[0];
    const signal = get.mock.calls[0][1]?.signal;
    await act(async () =>
      root.render(
        <FilenameAttribute
          filename="photo.png"
          namespaceId="namespace-b"
          resourceId="resource-a"
        />
      )
    );
    await act(async () => image.dispatchEvent(new Event('load')));
    expect(signal?.aborted).toBe(true);
    expect(preview()).toBeNull();
    expect(button().disabled).toBe(false);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('closes the preview when the filename changes to a non-image', async () => {
    await render();
    await click();
    await load();
    await render('report.pdf');
    expect(preview()).toBeNull();
    await click();
    expect(download).toHaveBeenCalledWith(
      'namespace-a',
      'resource-a',
      'report.pdf'
    );
  });

  it('allows retry when the file response contains no image URL', async () => {
    get.mockResolvedValueOnce({});
    await render();
    await click();
    expect(preview()).toBeNull();
    expect(button().disabled).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('chat.image.load_failed');
    await click();
    await load();
    expect(preview()).not.toBeNull();
  });
});
