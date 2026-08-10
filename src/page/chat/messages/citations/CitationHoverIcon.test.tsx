/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { useCopilotStore } from '@/page/copilot/copilotStore';

import { CitationHoverIcon } from './CitationHoverIcon';

jest.mock('react-router-dom', () => ({
  useParams: () => ({
    conversation_id: 'conversation-a',
    namespace_id: 'namespace-a',
  }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('CitationHoverIcon', () => {
  let container: HTMLDivElement;
  let root: Root;

  const renderCitation = async () => {
    await act(async () => {
      root.render(
        <CitationHoverIcon
          index={0}
          citation={{
            id: 'citation-a',
            title: 'Citation title',
            snippet: 'Citation hover content',
            link: 'Abcd1234Efgh5678',
          }}
        />
      );
    });
    return container.querySelector('button')!;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    useCopilotStore.setState({ workspaces: {} });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.useRealTimers();
  });

  it('closes the hover card before opening an internal citation preview', async () => {
    const trigger = await renderCitation();
    await act(async () => {
      trigger.focus();
      jest.advanceTimersByTime(700);
    });
    expect(document.body.textContent).toContain('Citation hover content');

    await act(async () => trigger.click());

    expect(document.body.textContent).not.toContain('Citation hover content');
    expect(useCopilotStore.getState().workspaces['namespace-a']).toMatchObject({
      conversationId: 'conversation-a',
      open: true,
      previewResourceId: 'Abcd1234Efgh5678',
      view: 'conversation',
    });
  });

  it('cancels a pending focus-open timer when the citation is clicked', async () => {
    const trigger = await renderCitation();

    await act(async () => {
      trigger.focus();
      trigger.click();
      jest.advanceTimersByTime(700);
    });

    expect(document.body.textContent).not.toContain('Citation hover content');
  });

  it('does not open a citation with an unsafe protocol', async () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    await act(async () => {
      root.render(
        <CitationHoverIcon
          index={0}
          citation={{
            id: 'citation-a',
            title: 'Unsafe citation',
            snippet: 'Unsafe citation content',
            link: 'javascript:alert(document.domain)',
          }}
        />
      );
    });

    await act(async () => container.querySelector('button')?.click());

    expect(openSpy).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });
});
