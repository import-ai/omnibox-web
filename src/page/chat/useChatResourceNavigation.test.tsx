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
  resource_id?: string;
  share_id?: string;
};
let routePathname = '/namespace-a/chat/conversation-a';

jest.mock('react-router-dom', () => ({
  useParams: () => routeParams,
  useLocation: () => ({ pathname: routePathname }),
}));

const RESOURCE_ID = 'Abcd1234Efgh5678';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function ResourceLink({
  lineNumber,
  onOpened,
}: {
  lineNumber?: number;
  onOpened?: () => void;
}) {
  const { canOpenInCopilot, getResourceLinkProps } =
    useChatResourceNavigation();

  return (
    <a
      data-can-open={canOpenInCopilot}
      href={`#resource-${RESOURCE_ID}`}
      {...getResourceLinkProps(RESOURCE_ID, onOpened, lineNumber)}
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
    routePathname = '/namespace-a/chat/conversation-a';
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

  async function renderLink(onOpened?: () => void, lineNumber?: number) {
    await act(async () =>
      root.render(<ResourceLink lineNumber={lineNumber} onOpened={onOpened} />)
    );
    return container.querySelector('a')!;
  }

  it('opens an authenticated internal resource beside the current conversation', async () => {
    const onOpened = jest.fn();
    const link = await renderLink(onOpened, 12);
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
      previewLineNumber: 12,
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
    routePathname = '/namespace-a';

    const link = await renderLink();

    expect(link.dataset.canOpen).toBe('false');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('opens a resource in the left pane when Copilot is open beside a resource page', async () => {
    routeParams = {
      namespace_id: 'namespace-a',
      resource_id: 'OldResource12abcd',
    };
    routePathname = '/namespace-a/OldResource12abcd';
    useCopilotStore
      .getState()
      .showConversation('namespace-a', 'conversation-a');

    const link = await renderLink();
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });

    expect(link.dataset.canOpen).toBe('true');
    expect(link.getAttribute('target')).toBeNull();

    await act(async () => link.dispatchEvent(click));

    expect(click.defaultPrevented).toBe(true);
    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
    ).toMatchObject({
      open: true,
      view: 'conversation',
      conversationId: 'conversation-a',
      previewResourceId: RESOURCE_ID,
    });
  });

  it('previews a resource when Copilot is open on a resource page without a conversation', async () => {
    routeParams = {
      namespace_id: 'namespace-a',
      resource_id: 'OldResource12abcd',
    };
    routePathname = '/namespace-a/OldResource12abcd';
    useCopilotStore.getState().open('namespace-a');

    const link = await renderLink();
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });

    await act(async () => link.dispatchEvent(click));

    expect(click.defaultPrevented).toBe(true);
    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
    ).toMatchObject({
      open: true,
      previewResourceId: RESOURCE_ID,
    });
  });
});
