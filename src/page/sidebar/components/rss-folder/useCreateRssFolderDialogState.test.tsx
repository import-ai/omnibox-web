/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { useCreateRssFolderDialogState } from './useCreateRssFolderDialogState';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('react-router-dom', () => ({
  useParams: () => ({ namespace_id: 'namespace-a' }),
}));

jest.mock('@/hooks/useRssFolderLimits', () => ({
  __esModule: true,
  default: () => ({ data: { tier: 'premium', linkLimit: 10 } }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('useCreateRssFolderDialogState', () => {
  let container: HTMLDivElement;
  let root: Root;
  let current: ReturnType<typeof useCreateRssFolderDialogState>;
  let runAnimationFrame: FrameRequestCallback;

  function Probe() {
    current = useCreateRssFolderDialogState({
      open: false,
      onOpenChange: jest.fn(),
      onConfirm: jest.fn(),
    });
    return <div ref={current.linkListRef} />;
  }

  beforeEach(() => {
    container = document.createElement('div');
    root = createRoot(container);
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      runAnimationFrame = callback;
      return 1;
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    jest.restoreAllMocks();
  });

  it('scrolls only after the added link overflows the list', async () => {
    await act(async () => root.render(<Probe />));

    const list = current.linkListRef.current!;
    const scrollTo = jest.fn();
    list.scrollTo = scrollTo;
    Object.defineProperties(list, {
      clientHeight: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 189 },
    });

    await act(async () => current.addLink());
    expect(current.rows).toHaveLength(2);
    runAnimationFrame(0);
    expect(scrollTo).not.toHaveBeenCalled();

    Object.defineProperty(list, 'scrollHeight', { value: 300 });
    await act(async () => current.addLink());
    expect(current.rows).toHaveLength(3);
    runAnimationFrame(0);
    expect(scrollTo).not.toHaveBeenCalled();

    Object.defineProperty(list, 'scrollHeight', { value: 395 });
    await act(async () => current.addLink());
    expect(current.rows).toHaveLength(4);
    runAnimationFrame(0);
    expect(scrollTo).toHaveBeenCalledWith({ top: 395, behavior: 'smooth' });
  });
});
