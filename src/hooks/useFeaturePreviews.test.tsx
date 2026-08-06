/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { http } from '@/lib/request';
import { useResourceStore } from '@/page/resource/resourceStore';

import useFeaturePreviews, {
  FeaturePreviewFeature,
} from './useFeaturePreviews';

jest.mock('@/lib/request', () => ({
  http: {
    get: jest.fn(),
    put: jest.fn(),
  },
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe('useFeaturePreviews', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    useResourceStore.getState().resetFeaturePreviews();
    jest.clearAllMocks();
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  it('ignores an old user response after the active user changes', async () => {
    const firstResponse = deferred<{
      features: Record<FeaturePreviewFeature, boolean>;
    }>();
    const secondResponse = deferred<{
      features: Record<FeaturePreviewFeature, boolean>;
    }>();
    const get = http.get as jest.Mock;
    get
      .mockReturnValueOnce(firstResponse.promise)
      .mockReturnValueOnce(secondResponse.promise);
    localStorage.setItem('uid', 'user-a');

    function Probe() {
      useFeaturePreviews();
      return null;
    }

    await act(async () => root.render(<Probe />));
    expect(get).toHaveBeenCalledTimes(1);

    localStorage.setItem('uid', 'user-b');
    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'uid', newValue: 'user-b' })
      );
    });
    expect(get).toHaveBeenCalledTimes(2);
    expect(useResourceStore.getState().featurePreviews).toEqual({});

    await act(async () => {
      firstResponse.resolve({
        features: { [FeaturePreviewFeature.EDITOR_V2]: true },
      });
      await firstResponse.promise;
    });
    expect(useResourceStore.getState().featurePreviews).toEqual({});

    await act(async () => {
      secondResponse.resolve({
        features: { [FeaturePreviewFeature.EDITOR_V2]: false },
      });
      await secondResponse.promise;
    });
    expect(useResourceStore.getState()).toMatchObject({
      featurePreviewsUserId: 'user-b',
      featurePreviews: { [FeaturePreviewFeature.EDITOR_V2]: false },
    });
  });

  it('clears another user state when loading fails', async () => {
    localStorage.setItem('uid', 'user-b');
    useResourceStore.getState().setFeaturePreviews('user-a', {
      [FeaturePreviewFeature.EDITOR_V2]: true,
    });
    const response = deferred<never>();
    (http.get as jest.Mock).mockReturnValueOnce(response.promise);

    function Probe() {
      useFeaturePreviews();
      return null;
    }

    await act(async () => root.render(<Probe />));
    await act(async () => {
      response.reject(new Error('network error'));
      await response.promise.catch(() => undefined);
    });

    expect(useResourceStore.getState()).toMatchObject({
      featurePreviewsUserId: null,
      featurePreviews: {},
    });
  });
});
