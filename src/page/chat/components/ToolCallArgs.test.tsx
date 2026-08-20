/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { ShareChatOnlyProvider } from '@/page/share/ShareChatOnlyContext';

import { ToolCallArgs } from './ToolCallArgs';

const RESOURCE_ID = 'Abcd1234Efgh5678';
const fetchShareResource = jest.fn();

jest.mock('react-router-dom', () => ({
  useParams: () => ({ share_id: 'Share12345' }),
  useLocation: () => ({ pathname: '/s/Share12345' }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/page/chat/ChatRouteParamsContext', () => ({
  useChatRouteParams: () => ({ namespaceId: '' }),
}));

jest.mock('@/page/sidebar/store', () => ({
  useRootId: () => undefined,
}));

jest.mock('@/service/resource', () => ({
  fetchResourcesByIds: jest.fn(),
}));

jest.mock('@/service/share', () => ({
  fetchShareResource: (...args: unknown[]) => fetchShareResource(...args),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('ToolCallArgs', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    fetchShareResource.mockReset();
    fetchShareResource.mockResolvedValue({
      id: RESOURCE_ID,
      name: 'Shared doc',
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const render = (chatOnly: boolean) =>
    act(() => {
      root.render(
        <ShareChatOnlyProvider chatOnly={chatOnly}>
          <ToolCallArgs
            args={[
              {
                key: 'resource_id',
                display: 'Abcd…5678',
                resourceId: RESOURCE_ID,
              },
            ]}
          />
        </ShareChatOnlyProvider>
      );
    });

  it('links a resource arg on an ordinary share', () => {
    render(false);
    expect(container.querySelector('a')).not.toBeNull();
  });

  it('keeps the arg a plain chip on a chat-only share', () => {
    render(true);
    expect(container.querySelector('a')).toBeNull();
    expect(container.querySelector('code')?.textContent).toBe('Abcd…5678');
  });

  it('does not try to resolve resource names on a chat-only share', () => {
    render(true);
    expect(fetchShareResource).not.toHaveBeenCalled();
  });
});
