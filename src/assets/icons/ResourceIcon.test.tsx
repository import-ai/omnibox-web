/** @jest-environment jsdom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { ResourceMeta } from '@/interface';

import ResourceIcon from './ResourceIcon';

const REDNOTE_FILL = '#ff2741';
const GLOBE_COLOR = '#4876ff';

function resource(
  resourceType: ResourceMeta['resource_type'],
  url?: string
): ResourceMeta {
  return {
    id: 'resource-1',
    parent_id: null,
    resource_type: resourceType,
    attrs: url ? { url } : {},
  };
}

function renderIcon(value: ResourceMeta) {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => {
    root.render(<ResourceIcon expand={false} resource={value} />);
  });
  return {
    container,
    unmount() {
      act(() => root.unmount());
    },
  };
}

function expectRedNote(container: HTMLElement) {
  expect(container.querySelector(`[fill="${REDNOTE_FILL}"]`)).not.toBeNull();
  expect(container.querySelector('.lucide-globe')).toBeNull();
}

function expectGlobe(container: HTMLElement) {
  expect(container.querySelector('.lucide-globe')).not.toBeNull();
  expect(container.querySelector('.lucide-globe')?.getAttribute('stroke')).toBe(
    GLOBE_COLOR
  );
  expect(container.querySelector(`[fill="${REDNOTE_FILL}"]`)).toBeNull();
}

describe('ResourceIcon link domains', () => {
  const roots: Array<{ unmount: () => void }> = [];

  afterEach(() => {
    roots.splice(0).forEach(mounted => mounted.unmount());
  });

  function mount(value: ResourceMeta) {
    const mounted = renderIcon(value);
    roots.push(mounted);
    return mounted.container;
  }

  it.each([
    'https://xhslink.cn/o/9mHaPXfRd5d',
    'https://www.xhslink.cn/abc',
    'https://XHSLINK.CN/o/9mHaPXfRd5d',
    'https://www.xiaohongshu.com/explore/x',
    'https://xhslink.com/a/x',
  ])('uses the Xiaohongshu icon for %s', url => {
    expectRedNote(mount(resource('link', url)));
  });

  it.each(['https://example.com/a', 'https://notxhslink.cn/a'])(
    'keeps the globe icon for %s',
    url => {
      expectGlobe(mount(resource('link', url)));
    }
  );

  it('uses the Xiaohongshu icon for an rss item on xhslink.cn', () => {
    expectRedNote(
      mount(resource('rss_item', 'https://xhslink.cn/o/9mHaPXfRd5d'))
    );
  });
});
