/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { ResourceCommentBody } from './ResourceCommentBody';

jest.mock('react', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  return { ...react, default: react };
});
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/lib/captcha', () => ({ isInsideAliyunCaptcha: () => false }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe('ResourceCommentBody', () => {
  let container: HTMLDivElement;
  let root: Root;
  let height: number;
  let measure: () => void;
  const disconnect = jest.fn();
  const parentClick = jest.fn();
  const originalResizeObserver = global.ResizeObserver;

  const render = (content = 'Comment') => {
    act(() => {
      root.render(
        <div onClick={parentClick}>
          <ResourceCommentBody content={content} />
        </div>
      );
    });
  };
  const toggle = () => container.querySelector<HTMLButtonElement>('button');
  const text = () => container.querySelector('p');

  beforeEach(() => {
    height = 17 * 24;
    disconnect.mockClear();
    parentClick.mockClear();
    jest.spyOn(window, 'getComputedStyle').mockReturnValue({
      lineHeight: '24px',
    } as CSSStyleDeclaration);
    jest
      .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
      .mockImplementation(() => height);
    global.ResizeObserver = jest.fn(callback => {
      measure = () => callback([], {} as ResizeObserver);
      return { observe: jest.fn(), unobserve: jest.fn(), disconnect };
    });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    global.ResizeObserver = originalResizeObserver;
    jest.restoreAllMocks();
  });

  it.each([15, 16, 17])('shows a toggle only above 16 lines (%i)', lines => {
    height = lines * 24;
    render();
    expect(!!toggle()).toBe(lines > 16);
    expect(text()?.hasAttribute('data-expanded')).toBe(false);
  });

  it('does not mistake rounded fractional line heights for overflow', () => {
    jest.mocked(window.getComputedStyle).mockReturnValue({
      lineHeight: '24.04px',
    } as CSSStyleDeclaration);
    height = 385;
    render();
    expect(toggle()).toBeNull();
    height = 409;
    act(() => measure());
    expect(toggle()).not.toBeNull();
  });

  it('expands and collapses without opening the reply composer', () => {
    render();
    expect(toggle()?.getAttribute('aria-expanded')).toBe('false');
    expect(toggle()?.getAttribute('aria-controls')).toBe(text()?.id);
    act(() => toggle()?.click());
    expect(toggle()?.textContent).toBe('resource_comments.collapse_content');
    expect(toggle()?.getAttribute('aria-expanded')).toBe('true');
    expect(text()?.hasAttribute('data-expanded')).toBe(true);
    act(() => measure());
    expect(toggle()).not.toBeNull();
    act(() => toggle()?.click());
    expect(toggle()?.textContent).toBe('resource_comments.expand_content');
    expect(text()?.hasAttribute('data-expanded')).toBe(false);
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('remeasures resizing and resets expansion when content changes', () => {
    render();
    act(() => toggle()?.click());
    height = 16 * 24;
    act(() => measure());
    expect(toggle()).toBeNull();
    expect(text()?.hasAttribute('data-expanded')).toBe(false);
    height = 17 * 24;
    act(() => measure());
    expect(toggle()?.getAttribute('aria-expanded')).toBe('false');
    act(() => toggle()?.click());
    render('Updated comment');
    expect(toggle()?.getAttribute('aria-expanded')).toBe('false');
    expect(disconnect).toHaveBeenCalledTimes(1);
    render('');
    expect(toggle()).toBeNull();
    expect(text()).toBeNull();
  });

  it('remeasures window resizing when ResizeObserver is unavailable', () => {
    global.ResizeObserver = undefined as unknown as typeof ResizeObserver;
    height = 16 * 24;
    render();
    expect(toggle()).toBeNull();
    height = 17 * 24;
    act(() => window.dispatchEvent(new Event('resize')));
    expect(toggle()).not.toBeNull();
  });
});
