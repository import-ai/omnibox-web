/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { useResourceCommentsPanel } from './ResourceCommentsContext';
import { useCommentNavigation } from './useCommentNavigation';

jest.mock('./ResourceCommentsContext', () => ({
  useResourceCommentsPanel: jest.fn(),
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const openThread = jest.fn();
const onLocated = jest.fn();

function Fixture() {
  const { focusThread, cancelNavigation } = useCommentNavigation(
    'resource',
    openThread
  );
  return (
    <>
      {['a', 'b'].map(id => (
        <button
          key={id}
          data-navigate={id}
          onClick={() =>
            focusThread(id, {
              onLocated: () => onLocated(id),
            })
          }
        >
          {id}
        </button>
      ))}
      <button
        data-start
        onClick={() =>
          focusThread('a', {
            align: 'start',
            onLocated: () => onLocated('a'),
          })
        }
      >
        Start
      </button>
      <button data-cancel onClick={cancelNavigation}>
        Cancel
      </button>
    </>
  );
}

describe('comment navigation alignment', () => {
  let root: Root;
  let container: HTMLDivElement;
  let controls: HTMLDivElement;
  let source: HTMLDivElement;
  let comments: HTMLDivElement;
  let shift: number;
  let quoteTops: Record<string, number>;
  let cardTops: Record<string, number>;

  const advance = async (milliseconds = 600) => {
    for (let elapsed = 0; elapsed < milliseconds; elapsed += 16) {
      await act(async () => jest.advanceTimersByTime(16));
    }
  };
  const click = async (selector: string) => {
    const button = controls.querySelector<HTMLButtonElement>(selector);
    if (!button) {
      throw new Error(`Missing control: ${selector}`);
    }
    await act(async () => button.click());
  };
  const cardTop = (id: string) => cardTops[id] - comments.scrollTop + shift;
  const quoteTop = (id: string) => quoteTops[id] - source.scrollTop;

  beforeEach(async () => {
    jest.useFakeTimers();
    shift = 0;
    quoteTops = { a: 160, b: 320 };
    cardTops = { a: 480, b: 720 };
    container = document.createElement('div');
    controls = document.createElement('div');
    source = document.createElement('div');
    source.setAttribute('data-resource-scroll', '');
    comments = document.createElement('div');
    comments.setAttribute('data-comments-scroll', '');
    for (const id of ['a', 'b']) {
      const marker = document.createElement('span');
      marker.dataset.resourceCommentThread = id;
      source.append(marker);
      const card = document.createElement('article');
      card.dataset.threadId = id;
      comments.append(card);
    }
    container.append(source, comments, controls);
    document.body.append(container);
    for (const scroll of [source, comments]) {
      Object.defineProperties(scroll, {
        clientHeight: { value: 600 },
        scrollHeight: { value: 2400 },
      });
    }
    jest.mocked(useResourceCommentsPanel).mockReturnValue({
      rootElement: container,
      panelElement: container,
      namespaceId: 'namespace',
      panelOpen: true,
      setPanelOpen: jest.fn(),
      setPanelElement: jest.fn(),
      get commentFocusOffset() {
        return shift;
      },
      setCommentFocusOffset: value => {
        shift = value;
      },
    });
    jest
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        const threadId = this.dataset.threadId;
        const markerId = this.dataset.resourceCommentThread;
        const top = threadId
          ? cardTop(threadId)
          : markerId
            ? quoteTop(markerId)
            : this === comments
              ? 48
              : 0;
        const height = threadId ? 120 : markerId ? 20 : 600;
        return {
          x: 0,
          y: top,
          top,
          bottom: top + height,
          left: 0,
          right: 300,
          width: 300,
          height,
          toJSON: () => ({}),
        };
      });
    root = createRoot(controls);
    await act(async () => root.render(<Fixture />));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('smoothly aligns a card with a visible quote without moving the document', async () => {
    await click('[data-navigate="a"]');
    await advance(64);
    expect(comments.scrollTop).toBeGreaterThan(0);
    expect(cardTop('a')).toBeGreaterThan(quoteTop('a'));
    expect(onLocated).not.toHaveBeenCalled();
    await advance();
    expect(cardTop('a')).toBeCloseTo(quoteTop('a'), 0);
    expect(source.scrollTop).toBe(0);
    expect(onLocated).toHaveBeenCalledTimes(1);
  });

  it('moves the document and card together when the quote is offscreen', async () => {
    quoteTops.a = 1600;
    cardTops.a = 1900;
    await click('[data-navigate="a"]');
    await advance(96);
    expect(source.scrollTop).toBeGreaterThan(0);
    expect(source.scrollTop).toBeLessThan(1528);
    expect(comments.scrollTop).toBeGreaterThan(0);
    expect(Math.abs(cardTop('a') - quoteTop('a'))).toBeLessThan(300);
    await advance();
    expect(quoteTop('a')).toBe(72);
    expect(cardTop('a')).toBeCloseTo(quoteTop('a'), 0);
  });

  it('moves an already visible quote and card near the top for previous/next navigation', async () => {
    await click('[data-start]');
    await advance(64);
    expect(source.scrollTop).toBeGreaterThan(0);
    expect(source.scrollTop).toBeLessThan(88);
    expect(onLocated).not.toHaveBeenCalled();
    await advance();
    expect(source.scrollTop).toBe(88);
    expect(quoteTop('a')).toBe(72);
    expect(cardTop('a')).toBeCloseTo(72, 0);
    expect(onLocated).toHaveBeenCalledTimes(1);
  });

  it('can align a card above its quote at the top scroll boundary', async () => {
    cardTops.a = 80;
    await click('[data-navigate="a"]');
    await advance();
    expect(comments.scrollTop).toBe(0);
    expect(shift).toBeGreaterThan(0);
    expect(cardTop('a')).toBeCloseTo(quoteTop('a'), 0);
    expect(onLocated).toHaveBeenCalledWith('a');
  });

  it('aligns against the actual quote when the document reaches its bottom boundary', async () => {
    quoteTops.a = 2200;
    cardTops.a = 2300;
    await click('[data-navigate="a"]');
    await advance();
    expect(source.scrollTop).toBe(1800);
    expect(cardTop('a')).toBeCloseTo(quoteTop('a'), 0);
  });

  it('only finishes the latest navigation after rapid switching in either direction', async () => {
    await click('[data-navigate="a"]');
    await advance(64);
    await click('[data-navigate="b"]');
    await advance(64);
    await click('[data-navigate="a"]');
    await advance();
    expect(cardTop('a')).toBeCloseTo(quoteTop('a'), 0);
    expect(onLocated).toHaveBeenCalledTimes(1);
    expect(onLocated).toHaveBeenCalledWith('a');
  });

  it('stops scrolling when navigation is cancelled by selecting a card', async () => {
    await click('[data-navigate="b"]');
    await advance(64);
    await click('[data-cancel]');
    const before = comments.scrollTop;
    await advance();
    expect(comments.scrollTop).toBe(before);
    expect(onLocated).not.toHaveBeenCalled();
  });

  it('brings a comment with a missing quote into the panel viewport', async () => {
    source.replaceChildren();
    await click('[data-navigate="a"]');
    await advance();
    expect(cardTop('a')).toBeCloseTo(60, 0);
    expect(source.scrollTop).toBe(0);
    expect(onLocated).toHaveBeenCalledWith('a');
  });
});
