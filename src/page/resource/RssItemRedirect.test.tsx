/** @jest-environment jsdom */

import { TextDecoder, TextEncoder } from 'util';

// jsdom ships without the web encoding globals react-router expects.
Object.assign(globalThis, { TextEncoder, TextDecoder });

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import RssItemRedirect from './RssItemRedirect';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function renderAt(path: string, routePath: string): HTMLElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  act(() => {
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={routePath} element={<RssItemRedirect />} />
          <Route path="/:namespace_id/:resource_id" element={<div>ns</div>} />
          <Route path="/s/:share_id/:resource_id" element={<div>share</div>} />
        </Routes>
      </MemoryRouter>
    );
  });
  return container;
}

describe('RssItemRedirect', () => {
  // The legacy item id was the primary key of the dropped rss_items table, so
  // it resolves to nothing today. The folder in the same url still exists.
  it('sends a legacy workspace item link to its folder', () => {
    const container = renderAt(
      '/ns-1/folder-1/rss-items/00000000-0000-0000-0000-000000000001',
      '/:namespace_id/:resource_id/rss-items/:rss_item_id'
    );
    expect(container.textContent).toBe('ns');
  });

  it('sends a legacy shared item link to its folder', () => {
    const container = renderAt(
      '/s/share-1/folder-1/rss-items/00000000-0000-0000-0000-000000000001',
      '/s/:share_id/:resource_id/rss-items/:rss_item_id'
    );
    expect(container.textContent).toBe('share');
  });
});
