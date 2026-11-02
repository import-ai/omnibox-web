/** @jest-environment jsdom */

import QRCode from 'qrcode';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { useQrCode } from './useQrCode';

jest.mock('qrcode', () => ({
  __esModule: true,
  default: {
    toDataURL: jest.fn(),
  },
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe('useQrCode', () => {
  let container: HTMLDivElement;
  let root: Root;
  let current = '';

  beforeEach(() => {
    jest.clearAllMocks();
    current = '';
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  function Probe({ url, enabled }: { url: string; enabled: boolean }) {
    current = useQrCode(url, enabled);
    return null;
  }

  it('clears an old image and ignores a QR code that finishes after closing', async () => {
    const encoding = deferred<string>();
    (QRCode.toDataURL as jest.Mock).mockReturnValueOnce(encoding.promise);

    await act(async () => {
      root.render(<Probe url="first-url" enabled />);
    });

    await act(async () => {
      root.render(<Probe url="" enabled={false} />);
    });
    expect(current).toBe('');

    await act(async () => {
      encoding.resolve('stale-image');
      await encoding.promise;
    });
    expect(current).toBe('');
  });
});
