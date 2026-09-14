/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import {
  ResourceCommentsProvider,
  useResourceCommentsPanel,
} from './ResourceCommentsContext';

jest.mock('react', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  return { ...react, default: react };
});
jest.mock('@/page/copilot/useCopilotPanelLayout', () => ({
  COPILOT_PANEL_TRANSITION_MS: 100,
  useCopilotPanelLayout: () => ({
    layout: { mode: 'split', panelWidth: 300 },
    setPanelElement: jest.fn(),
  }),
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function Fixture() {
  const panel = useResourceCommentsPanel();
  return (
    <>
      <button onClick={() => panel?.setPanelOpen(true)}>Open</button>
      <div data-resource-scroll />
      <div data-comments-scroll />
    </>
  );
}

describe('anchored comment wheel synchronization', () => {
  let root: Root;
  let container: HTMLDivElement;
  let documentScroll: HTMLElement;
  let commentsScroll: HTMLElement;
  beforeEach(async () => {
    sessionStorage.clear();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () =>
      root.render(
        <ResourceCommentsProvider namespaceId="namespace">
          <Fixture />
        </ResourceCommentsProvider>
      )
    );
    const source = container.querySelector<HTMLElement>(
      '[data-resource-scroll]'
    );
    const comments = container.querySelector<HTMLElement>(
      '[data-comments-scroll]'
    );
    if (!source || !comments) {
      throw new Error('Missing scroll surfaces');
    }
    documentScroll = source;
    commentsScroll = comments;
    for (const element of [source, comments]) {
      Object.defineProperties(element, {
        clientHeight: { value: 300 },
        scrollHeight: { value: 1000 },
      });
    }
    await act(async () => container.querySelector('button')?.click());
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    sessionStorage.clear();
  });
  const wheel = async (element: HTMLElement, deltaY: number) => {
    const event = new WheelEvent('wheel', {
      deltaY,
      bubbles: true,
      cancelable: true,
    });
    await act(async () => element.dispatchEvent(event));
    return event;
  };
  it('scrolls the resource when the pointer is over comments', async () => {
    const event = await wheel(commentsScroll, 120);
    expect(event.defaultPrevented).toBe(true);
    expect(documentScroll.scrollTop).toBe(120);
    expect(commentsScroll.scrollTop).toBe(0);
  });
  it('consumes sidebar overflow only at the document boundary and unwinds it first', async () => {
    documentScroll.scrollTop = 650;
    await wheel(commentsScroll, 120);
    expect(documentScroll.scrollTop).toBe(700);
    expect(commentsScroll.scrollTop).toBe(70);
    await wheel(commentsScroll, -100);
    expect(commentsScroll.scrollTop).toBe(0);
    expect(documentScroll.scrollTop).toBe(670);
  });
  it('retains native document scrolling away from the boundary', async () => {
    documentScroll.scrollTop = 200;
    expect((await wheel(documentScroll, 80)).defaultPrevented).toBe(false);
    expect(commentsScroll.scrollTop).toBe(0);
  });
});
