/** @jest-environment jsdom */
import { act, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { useSidebarStore } from '../store';
import { initialState, type TreeNode } from '../store/types';
import { useStickyFolder } from './useStickyFolder';

jest.mock('@/service/resource', () => ({}));

function Fixture() {
  const ref = useRef<HTMLDivElement>(null);
  const ui = useSidebarStore(s => s.ui);
  return (
    <>
      <div ref={ref} data-scroller>
        <div>
          {[0, 1, 2, 3, 4]
            .filter(i => i === 0 || ui[String(i - 1)]?.expanded)
            .map(i => (
              <div
                key={i}
                data-resource-tree-id={i}
                data-resource-depth={i}
                data-top={i * 100}
              >
                <div data-resource-row-id={i} data-top={i * 100}>
                  <button>Folder {i}</button>
                </div>
              </div>
            ))}
        </div>
      </div>
      <Probe scrollRef={ref} />
    </>
  );
}
function Probe({
  scrollRef,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { stickyId, collapse, locate } = useStickyFolder(scrollRef, 'test');
  return stickyId ? (
    <>
      <button data-collapse onClick={() => collapse(stickyId)}>
        {stickyId}
      </button>
      <button data-locate onClick={() => locate(stickyId)}>
        Locate
      </button>
    </>
  ) : null;
}
let host: HTMLDivElement;
let root: Root;
let scroller: HTMLDivElement;
const flush = () =>
  act(() => {
    jest.runOnlyPendingTimers();
  });
beforeEach(() => {
  jest.useFakeTimers();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  Object.assign(window, { CSS: { escape: (s: string) => s } });
  Object.assign(globalThis, {
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
  });
  const nodes = Object.fromEntries(
    [0, 1, 2, 3, 4].map(i => [
      String(i),
      {
        id: String(i),
        parentId: i ? String(i - 1) : null,
        name: String(i),
        resourceType: 'folder',
        spaceType: 'private',
        hasChildren: true,
        readOnly: false,
        createdAt: '',
        updatedAt: '',
        manualSortInitializedAt: null,
        children: [],
      } satisfies TreeNode,
    ])
  );
  const ui = Object.fromEntries(
    [0, 1, 2, 3, 4].map(i => [
      String(i),
      { expanded: true, loaded: true, loading: false },
    ])
  );
  useSidebarStore.setState({ ...initialState, nodes, ui });
  jest
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(function (this: HTMLElement) {
      const top =
        Number(this.dataset.top || 0) -
        (this.hasAttribute('data-top') ? scroller?.scrollTop || 0 : 0);
      const height = this.hasAttribute('data-resource-tree-id')
        ? 1000 - Number(this.dataset.top)
        : 34;
      return {
        top,
        bottom: top + height,
        height,
        left: 0,
        right: 250,
        width: 250,
        x: 0,
        y: top,
        toJSON: () => ({}),
      };
    });
  jest
    .spyOn(HTMLElement.prototype, 'getClientRects')
    .mockReturnValue({ length: 1 } as DOMRectList);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<Fixture />));
  scroller = host.querySelector('[data-scroller]')!;
  flush();
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  jest.restoreAllMocks();
  jest.useRealTimers();
});
function scroll(top: number) {
  act(() => {
    scroller.scrollTop = top;
    scroller.dispatchEvent(new Event('scroll'));
  });
  flush();
}
it('mounts against the actual scroller and hands off through five levels', () => {
  scroll(500);
  expect(host.querySelector('[data-collapse]')?.textContent).toBe('4');
  for (const expected of ['3', '2', '1', '0']) {
    act(() =>
      (host.querySelector('[data-collapse]') as HTMLButtonElement).click()
    );
    flush();
    expect(host.querySelector('[data-collapse]')?.textContent).toBe(expected);
    expect(host.querySelectorAll('[data-collapse]')).toHaveLength(1);
  }
  act(() =>
    (host.querySelector('[data-collapse]') as HTMLButtonElement).click()
  );
  flush();
  expect(host.querySelector('[data-collapse]')).toBeNull();
  expect(useSidebarStore.getState().activeId).toBeNull();
});
it('locates the original title without collapsing or activating it', () => {
  scroll(500);
  act(() => (host.querySelector('[data-locate]') as HTMLButtonElement).click());
  flush();
  expect(scroller.scrollTop).toBe(400);
  expect(useSidebarStore.getState().ui['4'].expanded).toBe(true);
  expect(useSidebarStore.getState().activeId).toBeNull();
});
