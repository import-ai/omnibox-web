/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { SystemNotificationContent } from './SystemNotificationContent';

jest.mock('@/components/markdown', () => ({
  Markdown: ({ content }: { content: string }) => <div>{content}</div>,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('SystemNotificationContent', () => {
  let container: HTMLDivElement;
  let root: Root;
  const createObjectURL = jest.fn(() => 'blob:notification-image');
  const revokeObjectURL = jest.fn();

  beforeAll(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('token', 'test-token');
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    localStorage.clear();
  });

  it('loads protected images with auth and revokes object URLs', async () => {
    const assetUrl = '/api/v1/notification-assets/image.png';
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      blob: jest.fn().mockResolvedValue(new Blob(['image'])),
    });
    global.fetch = fetchMock;

    await act(async () => {
      root.render(
        <SystemNotificationContent
          active
          content={`![first](${assetUrl}) ![second](${assetUrl})`}
        />
      );
    });
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(assetUrl, {
      credentials: 'same-origin',
      headers: { Authorization: 'Bearer test-token' },
      signal: expect.any(AbortSignal),
    });
    expect(container.textContent).toBe(
      '![first](blob:notification-image) ![second](blob:notification-image)'
    );

    await act(async () => {
      root.render(<SystemNotificationContent active content="Plain text" />);
    });

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:notification-image');
  });
});
