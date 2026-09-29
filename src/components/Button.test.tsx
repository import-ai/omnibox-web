/** @jest-environment jsdom */
import { act, createRef } from 'react';
import { createRoot } from 'react-dom/client';

import { Button } from './Button';

it('blocks interaction while loading and preserves refs and asChild composition', () => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  const root = createRoot(container);
  const onClick = jest.fn();
  const ref = createRef<HTMLButtonElement>();
  try {
    act(() =>
      root.render(
        <Button ref={ref} loading disabled={false} onClick={onClick}>
          Save
        </Button>
      )
    );
    expect(ref.current?.disabled).toBe(true);
    act(() => ref.current?.click());
    expect(onClick).not.toHaveBeenCalled();
    expect(container.querySelector('svg')).not.toBeNull();
    act(() =>
      root.render(
        <Button ref={ref} onClick={onClick}>
          Save
        </Button>
      )
    );
    expect(ref.current?.disabled).toBe(false);
    act(() => ref.current?.click());
    expect(onClick).toHaveBeenCalledTimes(1);
    act(() =>
      root.render(
        <Button asChild>
          <a href="/home">Home</a>
        </Button>
      )
    );
    expect(container.querySelector('button')).toBeNull();
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/home');
    act(() =>
      root.render(
        <Button asChild loading>
          <a href="/home" onClick={onClick}>
            Home
          </a>
        </Button>
      )
    );
    const link = container.querySelector('a')!;
    expect(link.querySelector('svg')).not.toBeNull();
    act(() => link.click());
    expect(onClick).toHaveBeenCalledTimes(1);
  } finally {
    act(() => root.unmount());
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = false;
  }
});
