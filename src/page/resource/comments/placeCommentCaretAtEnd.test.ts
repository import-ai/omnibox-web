/** @jest-environment jsdom */

import { placeCommentCaretAtEnd } from './placeCommentCaretAtEnd';

function rect(top: number, bottom: number): DOMRect {
  return {
    x: 0,
    y: top,
    width: 280,
    height: bottom - top,
    top,
    right: 280,
    bottom,
    left: 0,
    toJSON() {
      return {};
    },
  };
}

function mount(inputTop: number, inputBottom: number, composerBottom: number) {
  const scroller = document.createElement('div');
  scroller.setAttribute('data-comments-scroll', '');
  const composer = document.createElement('div');
  composer.className = 'omnibox-comment-composer--edit';
  const input = document.createElement('textarea');
  input.value = '大师的阿萨德阿迪按时收到\n'.repeat(30);
  composer.append(input);
  scroller.append(composer);
  document.body.append(scroller);

  scroller.getBoundingClientRect = () => rect(100, 500);
  composer.getBoundingClientRect = () => rect(inputTop, composerBottom);
  input.getBoundingClientRect = () => rect(inputTop, inputBottom);

  return { scroller, input };
}

describe('placeCommentCaretAtEnd', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('scrolls a long comment so the last line and actions stay in the panel', () => {
    const { scroller, input } = mount(160, 1400, 1460);
    scroller.scrollTop = 20;

    placeCommentCaretAtEnd(input);

    expect(input.selectionStart).toBe(input.value.length);
    expect(input.selectionEnd).toBe(input.value.length);
    // Button row ends at 1460; panel content ends at 500 - 8.
    expect(scroller.scrollTop).toBe(20 + 1460 - 492);
  });

  it('keeps the last line visible when content below it is taller than the panel', () => {
    const { scroller, input } = mount(160, 1400, 3200);

    placeCommentCaretAtEnd(input);

    // Last line is 20px. Scrolling further would push it above the panel.
    expect(scroller.scrollTop).toBe(1400 - 20 - 108);
  });

  it('scrolls up until the last line is inside the panel', () => {
    const { scroller, input } = mount(-200, 40, 80);
    scroller.scrollTop = 400;

    placeCommentCaretAtEnd(input);

    expect(scroller.scrollTop).toBe(400 + (40 - 20 - 108));
  });

  it('leaves a comment that already fits where it is', () => {
    const { scroller, input } = mount(160, 280, 340);
    scroller.scrollTop = 12;

    placeCommentCaretAtEnd(input);

    expect(input.selectionStart).toBe(input.value.length);
    expect(scroller.scrollTop).toBe(12);
  });
});
