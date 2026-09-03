/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import {
  getCopilotWorkspace,
  useCopilotStore,
} from '@/page/copilot/copilotStore';

import { CitationCard } from './CitationCard';

let routeParams: {
  conversation_id?: string;
  namespace_id?: string;
  share_id?: string;
};

jest.mock('react-router-dom', () => ({
  useParams: () => routeParams,
  useLocation: () => ({
    pathname: routeParams.share_id
      ? `/s/${routeParams.share_id}`
      : routeParams.conversation_id
        ? `/${routeParams.namespace_id}/chat/${routeParams.conversation_id}`
        : `/${routeParams.namespace_id}`,
  }),
}));

const RESOURCE_ID = 'Abcd1234Efgh5678';
const citation = {
  id: 'C1-resource-L12-18',
  title: 'Resource citation',
  snippet: 'Citation content',
  link: RESOURCE_ID,
};

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('CitationCard', () => {
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
    container.addEventListener('click', event => event.preventDefault());
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  async function renderCard(onOpenResource = jest.fn()) {
    await act(async () => {
      root.render(
        <CitationCard
          citation={citation}
          index={0}
          onOpenResource={onOpenResource}
        />
      );
    });
    return { link: container.querySelector('a')!, onOpenResource };
  }

  it('opens an internal citation resource and requests the sheet to close', async () => {
    const { link, onOpenResource } = await renderCard();

    await act(async () => link.click());

    expect(onOpenResource).toHaveBeenCalledTimes(1);
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

  it('keeps a shared resource as a new-tab link', async () => {
    routeParams = {
      conversation_id: 'conversation-a',
      share_id: 'share-a',
    };

    const { link, onOpenResource } = await renderCard();

    expect(link.getAttribute('href')).toBe(`/s/share-a/${RESOURCE_ID}#L12`);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(onOpenResource).not.toHaveBeenCalled();
  });
});
