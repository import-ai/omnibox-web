/** @jest-environment jsdom */

import { withAncestorScrollPreserved } from './preserveAncestorScroll';

function scrollingBox(scrollHeight: number, clientHeight: number, top: number) {
  const element = document.createElement('div');
  let height = scrollHeight;
  let scrollTop = top;
  Object.defineProperty(element, 'scrollHeight', {
    configurable: true,
    get: () => height,
  });
  Object.defineProperty(element, 'clientHeight', {
    configurable: true,
    get: () => clientHeight,
  });
  Object.defineProperty(element, 'scrollTop', {
    configurable: true,
    get: () => scrollTop,
    set: value => {
      scrollTop = Math.min(
        Math.max(0, value),
        Math.max(0, height - clientHeight)
      );
    },
  });
  return {
    element,
    collapse() {
      height = clientHeight;
      scrollTop = 0;
    },
    grow(nextHeight: number) {
      height = nextHeight;
    },
    top: () => scrollTop,
  };
}

describe('withAncestorScrollPreserved', () => {
  it('restores a scrolled ancestor after the measured element collapses', () => {
    const scroller = scrollingBox(1000, 200, 480);
    const child = document.createElement('textarea');
    scroller.element.append(child);

    withAncestorScrollPreserved(child, () => {
      scroller.collapse();
      scroller.grow(1000);
    });

    expect(scroller.top()).toBe(480);
  });

  it('keeps an end-aligned scroller at the end when the content grows', () => {
    const scroller = scrollingBox(1000, 200, 792);
    const child = document.createElement('textarea');
    scroller.element.append(child);

    withAncestorScrollPreserved(child, () => {
      scroller.collapse();
      scroller.grow(1200);
    });

    expect(scroller.top()).toBe(1000);
  });
});
