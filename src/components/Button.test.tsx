/** @jest-environment jsdom */
import { act, createRef } from 'react';
import { createRoot } from 'react-dom/client';

import { trackButtonClick } from '@/lib/trackButtonClick';

import { Button } from './Button';

jest.mock('@/lib/trackButtonClick', () => ({
  trackButtonClick: jest.fn(),
}));

const mockedTrackButtonClick = jest.mocked(trackButtonClick);

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
    expect(mockedTrackButtonClick).not.toHaveBeenCalled();
  } finally {
    act(() => root.unmount());
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = false;
  }
});

it('reports a click only when the button is enabled and named', () => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  const root = createRoot(container);
  mockedTrackButtonClick.mockClear();
  try {
    act(() =>
      root.render(
        <Button trackName="chat_message_send" variant="outline" size="sm">
          Send
        </Button>
      )
    );
    const button = container.querySelector('button')!;
    expect(button.hasAttribute('trackName')).toBe(false);
    act(() => button.click());
    expect(mockedTrackButtonClick).toHaveBeenCalledWith('chat_message_send', {
      variant: 'outline',
      size: 'sm',
    });

    mockedTrackButtonClick.mockClear();
    act(() =>
      root.render(
        <Button
          trackName="settings_api_key_delete"
          trackProps={{ resource_type: 'key' }}
          disabled
        >
          Delete
        </Button>
      )
    );
    act(() => container.querySelector('button')!.click());
    expect(mockedTrackButtonClick).not.toHaveBeenCalled();

    act(() =>
      root.render(
        <Button
          asChild
          trackName="share_link_copy"
          trackProps={{ target: 'link' }}
        >
          <a href="/share">Copy</a>
        </Button>
      )
    );
    act(() => container.querySelector('a')!.click());
    expect(mockedTrackButtonClick).toHaveBeenCalledWith('share_link_copy', {
      target: 'link',
    });
  } finally {
    act(() => root.unmount());
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = false;
  }
});
