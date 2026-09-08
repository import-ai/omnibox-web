/** @jest-environment jsdom */

import {
  applyVisualViewportMetrics,
  bindVisualViewport,
  getVisualViewportMetrics,
  syncVisualViewport,
} from './visualViewport';

describe('getVisualViewportMetrics', () => {
  it('falls back to innerHeight when visualViewport is missing', () => {
    expect(getVisualViewportMetrics(null, 800)).toEqual({
      height: 800,
      offsetTop: 0,
      keyboardOpen: false,
    });
  });

  it('treats a large visual viewport shrink as a keyboard', () => {
    expect(
      getVisualViewportMetrics({ height: 400, offsetTop: 0 }, 852)
    ).toEqual({
      height: 400,
      offsetTop: 0,
      keyboardOpen: true,
    });
  });

  it('follows iOS keyboard pan via offsetTop', () => {
    expect(
      getVisualViewportMetrics({ height: 400, offsetTop: 400 }, 852)
    ).toEqual({
      height: 400,
      offsetTop: 400,
      keyboardOpen: true,
    });
  });

  it('does not treat address-bar resize as a keyboard', () => {
    expect(
      getVisualViewportMetrics({ height: 780, offsetTop: 0 }, 852)
    ).toEqual({
      height: 780,
      offsetTop: 0,
      keyboardOpen: false,
    });
  });
});

describe('applyVisualViewportMetrics', () => {
  it('writes CSS variables and the keyboard class onto the root', () => {
    const root = document.createElement('html');

    applyVisualViewportMetrics(root, {
      height: 400,
      offsetTop: 180,
      keyboardOpen: true,
    });

    expect(root.style.getPropertyValue('--app-height')).toBe('400px');
    expect(root.style.getPropertyValue('--app-offset-top')).toBe('180px');
    expect(root.classList.contains('keyboard-open')).toBe(true);

    applyVisualViewportMetrics(root, {
      height: 800,
      offsetTop: 0,
      keyboardOpen: false,
    });

    expect(root.classList.contains('keyboard-open')).toBe(false);
  });
});

describe('syncVisualViewport', () => {
  it('pins the document to the visual viewport and resets window scroll', () => {
    const scrollTo = jest.fn();
    const target = {
      document,
      innerHeight: 852,
      scrollX: 0,
      scrollY: 24,
      visualViewport: { height: 420, offsetTop: 160 },
      requestAnimationFrame: jest.fn(),
      setTimeout: jest.fn(),
      clearTimeout: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      scrollTo,
    };

    const metrics = syncVisualViewport(target);

    expect(metrics).toEqual({
      height: 420,
      offsetTop: 160,
      keyboardOpen: true,
    });
    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('420px');
    expect(
      document.documentElement.style.getPropertyValue('--app-offset-top')
    ).toBe('160px');
    expect(document.documentElement.classList.contains('keyboard-open')).toBe(
      true
    );
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });
});

describe('bindVisualViewport', () => {
  it('syncs immediately and on visual viewport resize/scroll', () => {
    const listeners = new Map<string, EventListener>();
    const visualViewportListeners = new Map<string, EventListener>();
    const visualViewport = {
      height: 800,
      offsetTop: 0,
      addEventListener: jest.fn((type: string, listener: EventListener) => {
        visualViewportListeners.set(type, listener);
      }),
      removeEventListener: jest.fn((type: string) => {
        visualViewportListeners.delete(type);
      }),
    };
    const target = {
      document,
      innerHeight: 852,
      scrollX: 0,
      scrollY: 0,
      visualViewport,
      requestAnimationFrame: jest.fn((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      }),
      setTimeout: jest.fn(),
      clearTimeout: jest.fn(),
      addEventListener: jest.fn((type: string, listener: EventListener) => {
        listeners.set(type, listener);
      }),
      removeEventListener: jest.fn((type: string) => {
        listeners.delete(type);
      }),
      scrollTo: jest.fn(),
    };

    const unbind = bindVisualViewport(target);

    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('800px');
    expect(visualViewport.addEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function)
    );
    expect(visualViewport.addEventListener).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function)
    );

    visualViewport.height = 400;
    visualViewport.offsetTop = 220;
    visualViewportListeners.get('scroll')?.(new Event('scroll'));

    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('400px');
    expect(
      document.documentElement.style.getPropertyValue('--app-offset-top')
    ).toBe('220px');

    unbind();
    expect(listeners.size).toBe(0);
    expect(visualViewportListeners.size).toBe(0);
  });
});
