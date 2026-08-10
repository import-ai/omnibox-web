/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import {
  getCopilotWorkspace,
  useCopilotStore,
} from '@/page/copilot/copilotStore';

import { useChatResourceNavigation } from './useChatResourceNavigation';

let routeParams: {
  conversation_id?: string;
  namespace_id?: string;
  share_id?: string;
};

jest.mock('react-router-dom', () => ({
  useParams: () => routeParams,
}));

const RESOURCE_ID = 'Abcd1234Efgh5678';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function ResourceLink({ onOpened }: { onOpened?: () => void }) {
  const { canOpenInCopilot, getResourceLinkProps } =
    useChatResourceNavigation();

  return (
    <a
      data-can-open={canOpenInCopilot}
      href={`#resource-${RESOURCE_ID}`}
      {...getResourceLinkProps(RESOURCE_ID, onOpened)}
    >
      Resource
    </a>
  );
}

describe('useChatResourceNavigation', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    routeParams = {
      conversation_id: 'conversation-a',
      namespace_id: 'namespace-a',
    };
    sessionStorage.clear();
    useCopilotStore.setState({ workspaces: {} });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  async function renderLink(onOpened?: () => void) {
    await act(async () => root.render(<ResourceLink onOpened={onOpened} />));
    return container.querySelector('a')!;
  }

  it('opens an authenticated internal resource beside the current conversation', async () => {
    const onOpened = jest.fn();
    const link = await renderLink(onOpened);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });

    await act(async () => link.dispatchEvent(click));

    expect(click.defaultPrevented).toBe(true);
    expect(link.getAttribute('target')).toBeNull();
    expect(onOpened).toHaveBeenCalledTimes(1);
    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
    ).toMatchObject({
      open: true,
      view: 'conversation',
      conversationId: 'conversation-a',
      previewResourceId: RESOURCE_ID,
    });
  });

  it('preserves modified clicks for the browser', async () => {
    const onOpened = jest.fn();
    const link = await renderLink(onOpened);
    const click = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      metaKey: true,
    });

    await act(async () => link.dispatchEvent(click));

    expect(click.defaultPrevented).toBe(false);
    expect(onOpened).not.toHaveBeenCalled();
    expect(useCopilotStore.getState().workspaces).toEqual({});
  });

  it('keeps share resources opening in a new tab', async () => {
    routeParams = {
      conversation_id: 'conversation-a',
      share_id: 'share-a',
    };

    const link = await renderLink();

    expect(link.dataset.canOpen).toBe('false');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(useCopilotStore.getState().workspaces).toEqual({});
  });

  it('keeps links without a conversation identity opening in a new tab', async () => {
    routeParams = { namespace_id: 'namespace-a' };

    const link = await renderLink();

    expect(link.dataset.canOpen).toBe('false');
    expect(link.getAttribute('target')).toBe('_blank');
  });
});
