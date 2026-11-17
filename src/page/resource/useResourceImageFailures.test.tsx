/** @jest-environment jsdom */

import { act, useRef } from 'react';
import { createRoot } from 'react-dom/client';

import { useResourceImageFailures } from './useResourceImageFailures';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const imageSrc =
  '/api/v1/shares/share-1/resources/resource-1/attachments/image.png';

function Harness() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { failedImageCount, retryFailedImages } = useResourceImageFailures(
    containerRef,
    'Image unavailable',
    'resource-1'
  );

  return (
    <div ref={containerRef} data-failed-count={failedImageCount}>
      <div className="tiptap-image">
        <div className="tiptap-image-container">
          <div className="tiptap-image-content">
            <div aria-hidden="true" />
            <img className="tiptap-image-img" src={imageSrc} />
          </div>
        </div>
      </div>
      <button type="button" onClick={retryFailedImages}>
        Retry
      </button>
    </div>
  );
}

describe('useResourceImageFailures', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(async () => {
    container = document.body.appendChild(document.createElement('div'));
    root = createRoot(container);
    await act(async () => root.render(<Harness />));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('marks failed images and clears the fallback after a successful load', async () => {
    const wrapper = container.querySelector('.tiptap-image')!;
    const content = container.querySelector('.tiptap-image-content')!;
    const image = container.querySelector('img')!;

    await act(async () => image.dispatchEvent(new Event('error')));

    expect(wrapper.getAttribute('data-image-load-failed')).toBe('true');
    expect(content.getAttribute('data-image-error-label')).toBe(
      'Image unavailable'
    );
    expect(container.firstElementChild?.getAttribute('data-failed-count')).toBe(
      '1'
    );

    await act(async () => image.dispatchEvent(new Event('load')));

    expect(wrapper.hasAttribute('data-image-load-failed')).toBe(false);
    expect(content.hasAttribute('data-image-error-label')).toBe(false);
    expect(container.firstElementChild?.getAttribute('data-failed-count')).toBe(
      '0'
    );
  });

  it('requests failed images again without dropping the share context', async () => {
    const image = container.querySelector('img')!;

    await act(async () => image.dispatchEvent(new Event('error')));
    await act(async () =>
      container
        .querySelector('button')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    );

    const retried = new URL(image.getAttribute('src')!, window.location.href);
    expect(retried.pathname).toBe(imageSrc);
    expect(retried.searchParams.get('image_retry')).toBeTruthy();
  });
});
